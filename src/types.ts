/**
 * Types for expressing some typescript Types, and visitor definitions for type processors.
 */
import {checkArgument, checkNotNil, checkState, isNil} from './errors'

//tslint:disable:completed-docs

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

    visitRecursiveReference(ref: RecursiveReferenceType): T

    visitNamedType(t: NamedType): T
}

export interface Type {
    accept<T>(visitor: TypeVisitor<T>): T
}

export class PrimitiveType implements Type {
    constructor(readonly target: PrimitiveTypes) {
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
    properties: Map<string, Type>

    constructor() {
        this.properties = new Map()
    }

    static Of(spec: { [name: string]: Type }): ObjectType {
        const target = new ObjectType()
        for (const property of Object.getOwnPropertyNames(spec)) {
            target.addProperty(property, spec[property])
        }

        return target
    }

    addProperty(name: string, target: Type): this {
        checkArgument('name', !this.properties.has(name))
        this.properties.set(name, target)

        return this
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitObject(this)
    }
}

export class ArrayType implements Type {
    constructor(public target: Type) {

    }

    static Of(target: Type): ArrayType {
        return new ArrayType(target)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitArray(this)
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
}

export class UnionType extends ListOfTypes implements Type {
    static Of(types: Type[]): UnionType {
        const union = new UnionType()

        return union.addAll(types)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitUnion(this)
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
}

export class TupleType extends ListOfTypes implements Type {
    static Of(types: Type[]): TupleType {
        return (new TupleType()).addAll(types)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitTuple(this)
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

    static Of(value: string): LiteralStringType {
        return new LiteralStringType(value)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitLiteralString(this)
    }

}

export class LiteralNumberType implements Type {

    constructor(public value: number) {
    }

    static Of(value: number): LiteralNumberType {
        return new LiteralNumberType(value)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitLiteralNumber(this)
    }

}

export class LiteralBooleanType implements Type {

    constructor(public value: boolean) {
    }

    static Of(value: boolean): LiteralBooleanType {
        return new LiteralBooleanType(value)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitLiteralBoolean(this)
    }
}

export class RecursiveReferenceType implements Type {
    private target: NamedType | null

    constructor(target: NamedType | null) {
        this.target = target
    }

    static Of(target: NamedType): RecursiveReferenceType {
        return new RecursiveReferenceType(target)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitRecursiveReference(this)
    }

    getTarget(): NamedType {
        return checkNotNil(this.target)
    }

    resolve(target: NamedType): void {
        checkState(isNil(this.target))
        this.target = target
    }
}

export interface TypeName {
    name: string
    modulePath: string
    isExported: boolean
}

export class NamedType implements TypeName, Type {
    constructor(readonly name: string,
                readonly modulePath: string,
                readonly isExported: boolean,
                readonly target: Type) {

    }

    static Of(name: string, modulePath: string, isExported: boolean, target: Type): NamedType {
        return new NamedType(name, modulePath, isExported, target)
    }

    accept<T>(visitor: TypeVisitor<T>): T {
        return visitor.visitNamedType(this)
    }
}
