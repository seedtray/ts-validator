import {NamedType} from './types'

//tslint:disable:completed-docs

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

export class RecursiveValidation implements Validation {
    constructor(readonly ref: NamedType) {

    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitRecursiveValidation(this)
    }
}

export class ReferencableValidation implements Validation {
    constructor(readonly target: NamedType, readonly validation: Validation) {

    }

    accept<T>(visitor: ValidationVisitor<T>): T {
        return visitor.visitReferencableValidation(this)
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

    visitRecursiveValidation(r: RecursiveValidation): T

    visitReferencableValidation(r: ReferencableValidation): T
}
