import {checkArgument, checkNotNil, checkState, isNil} from './errors'

export enum PrimitiveTypes {
    number = 'number',
    boolean = 'boolean',
    string = 'string',
    null = 'null',
    undefined = 'undefined'
}

export interface TypeVisitor<T> {
    visitPrimitive(p: PrimitiveType): T

    visitObject(o: ObjectType): T

    visitArray(a: ArrayType): T

    visitUnion(u: UnionType): T

    visitIntersection(i: IntersectionType): T

    visitTuple(t: TupleType): T

    visitEnum(t: EnumType): T

    visitLiteralString(literal: LiteralStringType): T

    visitLiteralNumber(literal: LiteralNumberType): T

    visitLiteralBoolean(literal: LiteralBooleanType): T

    visitRecursiveReference(ref: RecursiveReferenceType): T
}

export interface Type {
    name?: string

    accept<T>(visitor: TypeVisitor<T>): T
}

export class PrimitiveType implements Type {
    constructor(public readonly of: PrimitiveTypes) {
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitPrimitive(this)
    }
}

export const numberType = new PrimitiveType(PrimitiveTypes.number)
export const stringType = new PrimitiveType(PrimitiveTypes.string)
export const booleanType = new PrimitiveType(PrimitiveTypes.boolean)
export const nullType = new PrimitiveType(PrimitiveTypes.null)
export const undefinedType = new PrimitiveType(PrimitiveTypes.undefined)

export class ObjectType implements Type {
    public properties: Map<string, Type>

    constructor(public name?: string) {
        this.properties = new Map()
    }

    addProperty(name: string, type: Type): this {
        checkArgument('name', !this.properties.has(name))
        this.properties.set(name, type)
        return this
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitObject(this)
    }

    static of(spec: { [name: string]: Type }, name?: string): ObjectType {
        const type = new ObjectType(name)
        for (const property of Object.getOwnPropertyNames(spec)) {
            type.addProperty(property, spec[property])
        }
        return type
    }
}

export class ArrayType implements Type {
    constructor(public of: Type) {

    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitArray(this)
    }

    static of(type: Type) {
        return new ArrayType(type)
    }
}

abstract class ListOfTypes {
    public readonly of: Array<Type>

    constructor() {
        this.of = []
    }

    add(type: Type): this {
        this.of.push(type)
        return this
    }

    addAll(types: Array<Type>): this {
        for (const type of types) {
            this.add(type)
        }
        return this
    }
}

export class UnionType extends ListOfTypes implements Type {
    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitUnion(this)
    }

    static of(types: Type[]): UnionType {
        const union = new UnionType()
        return union.addAll(types)
    }
}

export class IntersectionType extends ListOfTypes implements Type {
    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitIntersection(this)
    }

    static of(types: Type[]): IntersectionType {
        const intersection = new IntersectionType()
        return intersection.addAll(types)
    }
}

export class TupleType extends ListOfTypes implements Type {
    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitTuple(this)
    }

    static of(types: Type[]): TupleType {
        const tuple = new TupleType()
        return tuple.addAll(types)
    }
}

export class EnumType implements Type {
    members: Map<string, string | number>

    constructor() {
        this.members = new Map()
    }

    add(name: string, value: string | number): this {
        checkArgument('name', !this.members.has(name))
        this.members.set(name, value)
        return this
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitEnum(this)
    }
}

export class LiteralStringType implements Type {

    constructor(public value: string) {
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitLiteralString(this)
    }

    static of(value: string): LiteralStringType {
        return new LiteralStringType(value)
    }

}

export class LiteralNumberType implements Type {

    constructor(public value: number) {
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitLiteralNumber(this)
    }

    static of(value: number): LiteralNumberType {
        return new LiteralNumberType(value)
    }

}

export class LiteralBooleanType implements Type {

    constructor(public value: boolean) {
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitLiteralBoolean(this)
    }

    static of(value: boolean): LiteralBooleanType {
        return new LiteralBooleanType(value)
    }
}

export class RecursiveReferenceType implements Type {
    private target: Type | null

    constructor(of: Type | null) {
        this.target = of
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitRecursiveReference(this)
    }

    getTarget(): Type {
        return checkNotNil(this.target)
    }

    resolve(target: Type): void {
        checkState(isNil(this.target))
        this.target = target
    }

    static of(target: Type): RecursiveReferenceType {
        return new RecursiveReferenceType(target)
    }
}
