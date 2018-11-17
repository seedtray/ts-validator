/**
 * Visitor that emits a validator as a js expression source code.
 */
import {
    AllRequiredValidation,
    ArrayElementsValidation,
    ArrayElementValidation,
    CommonValidation,
    CommonValidations,
    EnumValueValidation,
    PreconditionValidation,
    PrimitiveBooleanValidation,
    PrimitiveNumberValidation,
    PrimitiveStringValidation,
    PropertyValidation,
    ReferenceTypeValidation,
    SomeRequiredValidation,
    ValidationVisitor,
} from './validation'

import {checkNotNil, fail} from './errors'

export class ExpressionEmitter implements ValidationVisitor<string> {
    private names: string[]
    private currentName: string

    constructor(paramName: string) {
        this.names = []
        this.currentName = paramName
    }

    visitCommon(c: CommonValidation): string {
        const value = this.currentName
        switch (c.kind) {
        case CommonValidations.isArray:
            return `Array.isArray(${value})`
        case CommonValidations.isObject:
            return `Object(${value}) === ${this.currentName}`
        case CommonValidations.isNull:
            return `${value} === null`
        case CommonValidations.isUndefined:
            return `${value} === undefined`
        case CommonValidations.isNumber:
            return `typeof ${value} === 'number'`
        case CommonValidations.isString:
            return `typeof ${value} === 'string'`
        case CommonValidations.isBoolean:
            return `typeof ${value} === 'boolean'`
        default:
            return fail()
        }
    }

    visitPrecondition(p: PreconditionValidation): string {
        const precondition = p.precondition.accept(this)
        const validation = p.validation.accept(this)

        return `((${precondition}) && (${validation}))`
    }

    visitProperty(p: PropertyValidation): string {
        this.pushName(`${this.currentName}.${p.property}`)
        const expression = p.validator.accept(this)
        this.popName()

        return expression
    }

    visitArray(a: ArrayElementsValidation): string {
        this.pushName('element')
        const validator = a.validator.accept(this)
        this.popName()

        return `Array.every(element => ${validator}, ${this.currentName})`
    }

    visitAllRequired(a: AllRequiredValidation): string {
        const validators = a.validations.map(validator => validator.accept(this))
        const asLines = validators.join('\n  && ')

        return `(${asLines})`
    }

    visitSomeRequired(s: SomeRequiredValidation): string {
        const validators = s.validations.map(validator => validator.accept(this))
        const asLines = validators.join('\n  || ')

        return `(${asLines})`
    }

    visitPrimitiveNumber(p: PrimitiveNumberValidation): string {
        return `${this.currentName} === ${p.value}`
    }

    visitPrimitiveString(p: PrimitiveStringValidation): string {
        return `${this.currentName} === "${p.value}"`
    }

    visitArrayElement(e: ArrayElementValidation): string {
        this.pushName(`${this.currentName}[${e.index}]`)
        const expression = e.validator.accept(this)
        this.popName()

        return expression
    }

    visitPrimitiveBoolean(p: PrimitiveBooleanValidation): string {
        const literal = p.value === true ? 'true' : 'false'

        return `${this.currentName} === "${literal}"`
    }

    visitEnum(e: EnumValueValidation): string {
        return fail('not implemented')
    }

    visitReference(r: ReferenceTypeValidation): string {
        return 'true'
        // return fail("Expression emitter can't deal with recursive types")
    }

    private pushName(newName: string): void {
        this.names.push(this.currentName)
        this.currentName = newName
    }

    private popName(): void {
        const lastName = this.names.pop()
        this.currentName = checkNotNil(lastName)
    }
}
