/**
 * Intermediate representation of a validation.
 */
import {fail} from './errors'
import {
    ArrayType,
    EnumType,
    IntersectionType,
    LiteralBooleanType,
    LiteralNumberType,
    LiteralStringType,
    ObjectType, PrimitiveType,
    PrimitiveTypes,
    RecursiveReferenceType,
    TupleType,
    Type,
    TypeVisitor,
    UnionType,
} from './types'

export interface Validation {
    accept<T>(visitor: ValidationVisitor<T>): T
}

export class PreconditionValidation implements Validation {
    constructor(public precondition: Validation, public validation: Validation) {

    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitPrecondition(this)
    }
}

export class PropertyValidation implements Validation {
    constructor(public property: string, public validator: Validation) {

    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitProperty(this)
    }
}

export class AllRequiredValidation implements Validation {
    constructor(public validations: Validation[]) {
    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitAllRequired(this)
    }
}

export class SomeRequiredValidation implements Validation {
    constructor(public validations: Validation[]) {
    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitSomeRequired(this)
    }
}

export class ArrayElementsValidation implements Validation {
    constructor(public validator: Validation) {
    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitArray(this)
    }
}

export enum CommonValidations {
    isObject,
    isArray,
    isNumber,
    isBoolean,
    isString,
    isNull,
    isUndefined,
}

export class CommonValidation implements Validation {
    constructor(public kind: CommonValidations) {

    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitCommon(this)
    }
}

export class PrimitiveNumberValidation implements Validation {
    constructor(public value: number) {
    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitPrimitiveNumber(this)
    }
}

export class PrimitiveBooleanValidation implements Validation {
    constructor(public value: boolean) {
    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitPrimitiveBoolean(this)
    }
}

export class PrimitiveStringValidation implements Validation {
    constructor(public value: string) {
    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitPrimitiveString(this)
    }

}

export class ArrayElementValidation implements Validation {
    constructor(public index: number, public validator: Validation) {

    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitArrayElement(this)
    }
}

export class EnumValueValidation implements Validation {

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitEnum(this)
    }
}

export class ReferenceTypeValidation implements Validation {
    constructor(readonly target: Type) {

    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitReference(this)
    }
}

export interface ValidationVisitor<T> {
    visitCommon(c: CommonValidation): T

    visitPrecondition(p: PreconditionValidation): T

    visitProperty(p: PropertyValidation): T

    visitArray(a: ArrayElementsValidation): T

    visitAllRequired(a: AllRequiredValidation): T

    visitSomeRequired(s: SomeRequiredValidation): T

    visitPrimitiveNumber(p: PrimitiveNumberValidation): T

    visitPrimitiveString(p: PrimitiveStringValidation): T

    visitArrayElement(e: ArrayElementValidation): T

    visitPrimitiveBoolean(p: PrimitiveBooleanValidation): T

    visitEnum(e: EnumValueValidation): T

    visitReference(r: ReferenceTypeValidation): T
}

export class ValidationGenerator implements TypeVisitor<Validation> {

    visitPrimitive(primitive: PrimitiveType): CommonValidation {
        return new CommonValidation(this.getCommonValidations(primitive.target))
    }

    visitObject(o: ObjectType): Validation {
        return new PreconditionValidation(
            new CommonValidation(CommonValidations.isObject),
            new AllRequiredValidation(Array.from(this.objectPropertiesValidation(o.properties)))
        )
    }

    visitArray(a: ArrayType): Validation {
        return new PreconditionValidation(
            new CommonValidation(CommonValidations.isArray),
            new ArrayElementsValidation(a.target.accept(this))
        )
    }

    visitUnion(u: UnionType): Validation {
        return new SomeRequiredValidation(u.target.map(target => target.accept(this)))
    }

    visitIntersection(i: IntersectionType): Validation {
        return new AllRequiredValidation(i.target.map(target => target.accept(this)))
    }

    visitTuple(t: TupleType): Validation {
        const elementValidations = t.target.map(
            (target, i) => new ArrayElementValidation(i, target.accept(this))
        )

        return new PreconditionValidation(
            new AllRequiredValidation(
                [
                    new CommonValidation(CommonValidations.isArray),
                    new PropertyValidation('length',
                                           new PrimitiveNumberValidation(t.target.length)),
                ]),
            new AllRequiredValidation(elementValidations),
        )
    }

    visitEnum(t: EnumType): Validation {
        return new EnumValueValidation()
    }

    visitLiteralString(literal: LiteralStringType): Validation {
        return new PrimitiveStringValidation(literal.value)
    }

    visitLiteralNumber(literal: LiteralNumberType): Validation {
        return new PrimitiveNumberValidation(literal.value)
    }

    visitLiteralBoolean(literal: LiteralBooleanType): Validation {
        return new PrimitiveBooleanValidation(literal.value)
    }

    visitRecursiveReference(ref: RecursiveReferenceType): Validation {
        return new ReferenceTypeValidation(ref.getTarget())
    }

    private getCommonValidations(primitiveType: PrimitiveTypes): CommonValidations {
        switch (primitiveType) {
        case 'number':
            return CommonValidations.isNumber
        case 'boolean':
            return CommonValidations.isBoolean
        case 'null':
            return CommonValidations.isNull
        case 'undefined':
            return CommonValidations.isUndefined
        case 'string':
            return CommonValidations.isString
        default:
            return fail()
        }
    }

    private* objectPropertiesValidation(properties: Map<string, Type>): IterableIterator<Validation> {
        for (const [property, type] of properties.entries()) {
            yield new PropertyValidation(property, type.accept(this))
        }
    }
}
