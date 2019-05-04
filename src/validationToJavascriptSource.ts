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
    ReferencableValidation,
    SomeRequiredValidation,
    Validation,
    ValidationVisitor,
} from './validation'

import {checkNotNil, fail} from './errors'

/**
 * A Validation visitor that emits a javascript expression source code implementing that validation.
 * This is, a boolean expression that would yield true if all the Validation predicate is satisfied.
 */
export class JavascriptSourceValidationVisitor implements ValidationVisitor<string> {
    private names: string[]
    private currentName: string

    constructor(variableName: string) {
        this.names = []
        this.currentName = variableName
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

        return `${this.currentName}.every(element => ${validator})`
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

    visitReferencableValidation(r: ReferencableValidation): string {
        return r.validation.accept(this)
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

/**
 * Emits a javascript expression that implements a validation.
 *
 * Just convenience function over JavascriptSourceValidationVisitor.
 */
export function validationToJavascriptSource(validation: Validation, variableName: string): string {
    return validation.accept(new JavascriptSourceValidationVisitor(variableName))

}
