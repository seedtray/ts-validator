/**
 * Types for expressing some typescript Types, and visitor definitions for type processors.
 */
import {checkArgument, checkNotNil, checkState, isNil} from './errors'
import {Arrays} from './lang/arrays'
import {Maps} from './lang/maps'

// tslint:disable:completed-docs

export enum PrimitiveTypes {
    number = 'number',
    boolean = 'boolean',
    string = 'string',
    null = 'null',
    undefined = 'undefined',
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

    visitNamedType(t: NamedType): T
}

export interface Type {
    accept<T>(visitor: TypeVisitor<T>): T

    equal(other: Type): boolean
}

export class PrimitiveType implements Type {
    constructor(readonly target: PrimitiveTypes) {
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitPrimitive(this)
    }

    equal(other: Type): boolean {
        return other instanceof PrimitiveType && this.target === other.target
    }
}

export const numberType = new PrimitiveType(PrimitiveTypes.number)
export const stringType = new PrimitiveType(PrimitiveTypes.string)
export const booleanType = new PrimitiveType(PrimitiveTypes.boolean)
export const nullType = new PrimitiveType(PrimitiveTypes.null)
export const undefinedType = new PrimitiveType(PrimitiveTypes.undefined)
export const nullableType = (target: Type) => UnionType.Of([nullType, target])

export class ObjectType implements Type {
    static Of(spec: { [name: string]: Type }): ObjectType {
        const target = new ObjectType()
        for (const property of Object.getOwnPropertyNames(spec)) {
            target.addProperty(property, spec[property])
        }

        return target
    }

    properties: Map<string, Type>

    constructor() {
        this.properties = new Map()
    }

    addProperty(name: string, target: Type): this {
        checkArgument(!this.properties.has(name))
        this.properties.set(name, target)

        return this
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitObject(this)
    }

    size(): number {
        return this.properties.size
    }

    equal(other: Type): boolean {
        if (!(other instanceof ObjectType) || this.size() !== other.size()) {
            return false
        }
        return Maps.equal(this.properties, other.properties, (t1, t2) => t1.equal(t2))
    }
}

export class ArrayType implements Type {
    static Of(target: Type): ArrayType {
        return new ArrayType(target)
    }

    constructor(public target: Type) {

    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitArray(this)
    }

    equal(other: Type): boolean {
        return other instanceof ArrayType && this.target.equal(other.target)
    }
}

abstract class ListOfTypes {
    readonly target: Type[]

    protected constructor() {
        this.target = []
    }

    add(target: Type): this {
        this.target.push(target)

        return this
    }

    addAll(types: Type[]): this {
        for (const target of types) {
            this.add(target)
        }

        return this
    }

    protected equalSameOrder(other: ListOfTypes): boolean {
        return Arrays.equal(this.target, other.target, (t1, t2) => t1.equal(t2))
    }

    protected isPermutation(other: ListOfTypes): boolean {
        return Arrays.isPermutation(this.target, other.target, (t1, t2) => t1.equal(t2))
    }
}

export class UnionType extends ListOfTypes implements Type {
    static Of(types: Type[]): UnionType {
        const union = new UnionType()

        return union.addAll(types)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitUnion(this)
    }

    equal(other: Type): boolean {
        return other instanceof UnionType && super.isPermutation(other)
    }
}

export class IntersectionType extends ListOfTypes implements Type {
    static Of(types: Type[]): IntersectionType {
        const intersection = new IntersectionType()

        return intersection.addAll(types)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitIntersection(this)
    }

    equal(other: Type): boolean {
        return other instanceof IntersectionType && super.isPermutation(other)
    }

}

export class TupleType extends ListOfTypes implements Type {
    static Of(types: Type[]): TupleType {
        return (new TupleType()).addAll(types)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitTuple(this)
    }

    equal(other: Type): boolean {
        return other instanceof TupleType && super.equalSameOrder(other);
    }
}

export class EnumType implements Type {
    static Of(spec: { [name: string]: string | number }): EnumType {
        const target = new EnumType()
        for (const property of Object.getOwnPropertyNames(spec)) {
            target.add(property, spec[property])
        }

        return target
    }

    members: Map<string, string | number>

    constructor() {
        this.members = new Map()
    }

    add(name: string, value: string | number): this {
        checkArgument(!this.members.has(name))
        this.members.set(name, value)

        return this
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitEnum(this)
    }

    equal(other: Type): boolean {
        return other instanceof EnumType && Maps.equal(
            this.members,
            other.members,
            (m1, m2) => m1 === m2
        )
    }
}

export class LiteralStringType implements Type {

    static Of(value: string): LiteralStringType {
        return new LiteralStringType(value)
    }

    constructor(public value: string) {
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitLiteralString(this)
    }

    equal(other: Type): boolean {
        return other instanceof LiteralStringType && this.value === other.value
    }

}

export class LiteralNumberType implements Type {

    static Of(value: number): LiteralNumberType {
        return new LiteralNumberType(value)
    }

    constructor(public value: number) {
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitLiteralNumber(this)
    }

    equal(other: Type): boolean {
        return other instanceof LiteralNumberType && this.value === other.value
    }
}

export class LiteralBooleanType implements Type {

    static Of(value: boolean): LiteralBooleanType {
        return new LiteralBooleanType(value)
    }

    constructor(public value: boolean) {
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitLiteralBoolean(this)
    }

    equal(other: Type): boolean {
        return other instanceof LiteralBooleanType && this.value === other.value
    }
}

export interface TypeName {
    name: string
    modulePath: string
    isExported: boolean
}

export class NamedType implements TypeName, Type {
    static Of(name: string, modulePath: string, isExported: boolean, target: Type): NamedType {
        return new NamedType(name, modulePath, isExported, target)
    }

    constructor(readonly name: string,
                readonly modulePath: string,
                readonly isExported: boolean,
                readonly target: Type) {

    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitNamedType(this)
    }

    equal(other: Type): boolean {
        return (
            other instanceof NamedType
            && this.name === other.name
            && this.target.equal(other.target)
        )
    }
}
