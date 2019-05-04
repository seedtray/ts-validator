/**
 * Pretty printer for parsed types.
 */
import {
    ArrayType,
    EnumType,
    IntersectionType,
    LiteralBooleanType,
    LiteralNumberType,
    LiteralStringType, NamedType,
    ObjectType,
    PrimitiveType,
    TupleType,
    Type,
    TypeVisitor,
    UnionType,
} from './types'

import {fail} from './errors'

/**
 * A prettified type fragment that fits in a single line.
 */
export class PrettyInline {

    static joinSurround(parts: string[],
                        joiner: string,
                        prefix: string = '',
                        suffix: string = ''): PrettyInline {

        return new PrettyInline(prefix + parts.join(joiner) + suffix)
    }

    constructor(public expression: string) {
    }

    toLines(indent: number): string {
        return ' '.repeat(indent) + this.expression
    }

    toString(): string {
        return this.toLines(0)
    }

    withSuffix(suffix: string): PrettyInline {
        return new PrettyInline(this.expression + suffix)
    }
}

/**
 * A prettified block of text for representing a type.
 */
export class PrettyBlock {
    constructor(public opening: PrettyInline, public parts: PrettyType[], public end: PrettyInline) {

    }

    surround(prefix: string, suffix: string): PrettyBlock {
        return new PrettyBlock(
            new PrettyInline(`${prefix}${this.opening.expression}`),
            this.parts,
            new PrettyInline(`${this.end.expression}${suffix}`)
        )
    }

    toLines(indent: number): string {
        return [
            this.opening.toLines(indent),
            this.parts.map(part => part.toLines(indent + 2)).join('\n'),
            this.end.toLines(indent),
        ].join('\n')
    }

    toString(): string {
        return this.toLines(0)
    }
}

type PrettyType = PrettyInline | PrettyBlock

/**
 * Transform a parsed type to a pretty printed version of it.
 */
export class TypePrettyPrinter implements TypeVisitor<PrettyType> {

    visitPrimitive(p: PrimitiveType): PrettyType {
        return new PrettyInline(p.target)
    }

    visitArray(a: ArrayType): PrettyType {
        const prettyOf = a.target.accept(this)
        if (a.target instanceof PrimitiveType) {
            return new PrettyInline(`${prettyOf}[]`)
        } else if (prettyOf instanceof PrettyInline) {
            return new PrettyInline(`Array<${prettyOf}>`)
        } else if (prettyOf instanceof PrettyBlock) {
            return prettyOf.surround('Array<', '>')
        } else {
            return fail()
        }
    }

    visitObject(o: ObjectType): PrettyType {
        return new PrettyBlock(
            new PrettyInline('{'),
            Array.from(this.prettyProperties(o.properties)),
            new PrettyInline('}')
        )
    }

    visitUnion(u: UnionType): PrettyType {
        return this.prettyListOfTypes(
            u.target,
            parts =>
                new PrettyInline(parts.map(part => part.expression).join(' | ')),
            parts => new PrettyBlock(
                new PrettyInline('Union('),
                parts,
                new PrettyInline(')')
            )
        )
    }

    visitIntersection(i: IntersectionType): PrettyType {
        return this.prettyListOfTypes(
            i.target,
            parts =>
                new PrettyInline(parts.map(part => part.expression).join(' & ')),
            parts => new PrettyBlock(
                new PrettyInline('Intersection('),
                parts,
                new PrettyInline(')')
            )
        )
    }

    visitTuple(t: TupleType): PrettyType {
        return this.prettyListOfTypes(
            t.target,
            parts => PrettyInline.joinSurround(
                parts.map(part => part.expression),
                ', ', '[', ']'
            ),
            parts => new PrettyBlock(
                new PrettyInline('Union('),
                parts,
                new PrettyInline(')')
            )
        )

    }

    visitEnum(t: EnumType): PrettyType {
        return new PrettyBlock(
            new PrettyInline('Enum('),
            Array.from(this.prettyEnumMembers(t.members)),
            new PrettyInline(')'),
        )
    }

    visitLiteralString(literal: LiteralStringType): PrettyType {
        return new PrettyInline(`'${literal.value}'`)
    }

    visitLiteralNumber(literal: LiteralNumberType): PrettyType {
        return new PrettyInline(`'${literal.value}'`)
    }

    visitLiteralBoolean(literal: LiteralBooleanType): PrettyType {
        return new PrettyInline(`'${literal.value}'`)
    }

    visitNamedType(t: NamedType): PrettyType {
        const nameRef = ` [${t.name}]`
        const prettyType = t.target.accept(this)
        if (prettyType instanceof PrettyBlock) {
            return new PrettyBlock(
                prettyType.opening.withSuffix(nameRef),
                prettyType.parts,
                prettyType.end
            )
        } else {
            return prettyType.withSuffix(nameRef)
        }
    }

    private* prettyProperties(properties: Map<string, Type>): IterableIterator<PrettyType> {
        for (const [name, type] of properties.entries()) {
            const prettyProperty = type.accept(this)
            if (prettyProperty instanceof PrettyInline) {
                yield new PrettyInline(`${name}: ${prettyProperty.expression}`)
            } else if (prettyProperty instanceof PrettyBlock) {
                yield prettyProperty.surround(`${name}: `, '')
            }
        }
    }

    private prettyListOfTypes(listOfTypes: Type[], inlineCase: (parts: PrettyInline[]) => PrettyType,
                              complexCase: (parts: PrettyType[]) => PrettyType): PrettyType {
        const prettyMembers = listOfTypes.map(target => target.accept(this))
        if (prettyMembers.every(pretty => pretty instanceof PrettyInline)) {
            return inlineCase(prettyMembers as PrettyInline[])
        } else {
            return complexCase(prettyMembers)
        }

    }

    // Quote a string. Does not deal well with single quotes in values.
    private quote(s: string): string {
        return `'${s}'`
    }

    private* prettyEnumMembers(
        members: Map<string, string | number>): IterableIterator<PrettyInline> {

        for (const [name, value] of members.entries()) {
            const prettyValue = typeof value === 'string' ? this.quote(value) : value
            yield  new PrettyInline(`${name}=${prettyValue},`)

        }

    }

}
