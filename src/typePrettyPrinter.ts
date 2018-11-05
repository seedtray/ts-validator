import {
    ArrayType,
    EnumType,
    IntersectionType,
    LiteralBooleanType,
    LiteralNumberType,
    LiteralStringType,
    ObjectType,
    PrimitiveType,
    RecursiveReferenceType,
    TupleType,
    Type,
    TypeVisitor,
    UnionType
} from './types'

import {checkNotNil, fail, isNil} from './errors'

export class PrettyInline {

    constructor(public expression: string) {
    }

    static joinSurround(parts: string[], joiner: string, prefix = '', suffix = ''): PrettyInline {
        return new PrettyInline(prefix + parts.join(joiner) + suffix)
    }

    toLines(indent: number): string {
        return ' '.repeat(indent) + this.expression
    }

    toString(): string {
        return this.toLines(0)
    }
}

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
            this.end.toLines(indent)
        ].join('\n')
    }

    toString(): string {
        return this.toLines(0)
    }
}

type PrettyType = PrettyInline | PrettyBlock

export class TypePrettyPrinter implements TypeVisitor<PrettyType> {
    private visitedRecursiveStack: Type[]

    constructor() {
        this.visitedRecursiveStack = []
    }

    visitPrimitive(p: PrimitiveType): PrettyType {
        return new PrettyInline(p.of)
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

    visitObject(o: ObjectType): PrettyType {
        return new PrettyBlock(
            new PrettyInline('{'),
            Array.from(this.prettyProperties(o.properties)),
            new PrettyInline('}')
        )
    }

    visitArray(a: ArrayType): PrettyType {
        const prettyOf = a.of.accept(this)
        if (a.of instanceof PrimitiveType) {
            return new PrettyInline(`${prettyOf}[]`)
        } else if (prettyOf instanceof PrettyInline) {
            return new PrettyInline(`Array<${prettyOf}>`)
        } else if (prettyOf instanceof PrettyBlock) {
            return prettyOf.surround('Array<', '>')
        } else {
            return fail()
        }
    }

    private prettyListOfTypes(listOfTypes: Type[], inlineCase: (parts: PrettyInline[]) => PrettyType,
                              complexCase: (parts: PrettyType[]) => PrettyType): PrettyType {
        const prettyMembers = listOfTypes.map(type => type.accept(this))
        if (prettyMembers.every(pretty => pretty instanceof PrettyInline)) {
            const prettyExpressions = prettyMembers as PrettyInline[]
            return inlineCase(prettyExpressions)
        } else {
            return complexCase(prettyMembers)
        }

    }

    visitUnion(u: UnionType): PrettyType {
        return this.prettyListOfTypes(u.of,
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
        return this.prettyListOfTypes(i.of,
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
        return this.prettyListOfTypes(t.of,
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

    private quote(s: string) {
        // TODO; properly escape quotes, handle single/double quotes, etc.
        return `'${s}'`
    }

    private* prettyEnumMembers(members: Map<string, string | number>): IterableIterator<PrettyInline> {
        for (const [name, value] of members.entries()) {
            const prettyValue = typeof value === 'string' ? this.quote(value) : value
            yield  new PrettyInline(`${name}=${prettyValue},`)

        }

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

    visitRecursiveReference(ref: RecursiveReferenceType): PrettyType {
        const name = checkNotNil(ref.getTarget().name, 'expected recursive type to have a name')
        const target = ref.getTarget()
        if (!isNil(this.visitedRecursiveStack.find(t => t === target))) {
            return new PrettyInline(`RecursiveReference<${name}>`)
        }
        this.visitedRecursiveStack.push(target)
        const prettified = ref.getTarget().accept(this)
        this.visitedRecursiveStack.pop()
        return new PrettyBlock(new PrettyInline(`#${name}(`), [prettified], new PrettyInline(`)`))
    }
}
