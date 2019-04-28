// tslint:disable:missing-jsdoc

import {checkState} from './errors'
import {
    LiteralStringType,
    numberType,
    ObjectType,
    PrimitiveType,
    PrimitiveTypes,
    stringType,
    TupleType,
    Type,
    UnionType,
} from './types'
import {typeToValidation} from './typeToValidation'
import {validationToJavascriptSource} from './validationToJavascriptSource'

function getAssignmentCode(name: string, value: any): string {
    const valueRepr = JSON.stringify(value)

    return `var ${name} = ${valueRepr}`
}

function typeToJsValidator(name: string, target: Type): string {
    const validation = typeToValidation(target)

    return validationToJavascriptSource(validation, name)
}

function runValidation(target: Type, value: any): boolean {
    const variableName = 'v'
    const assignment = getAssignmentCode(variableName, value)
    const emittedValidation = typeToJsValidator(variableName, target)
    const snippet = `${assignment};\n${emittedValidation}`
    // tslint:disable-next-line:no-eval
    const isValid: any = eval(snippet)
    checkState(typeof isValid === 'boolean')

    return isValid as boolean
}

test('basic number validator', () => {
    const target = new PrimitiveType(PrimitiveTypes.number)
    const emitted = typeToJsValidator('n', target)
    expect(emitted).toBe("typeof n === 'number'")
})

test('object emitted code', () => {
    const target = ObjectType.Of({
        a: numberType,
        b: TupleType.Of([numberType, stringType]),
    })
    expect(runValidation(target, null)).toBe(false)
    expect(runValidation(target, undefined)).toBe(false)
    expect(runValidation(target, true)).toBe(false)
    expect(runValidation(target, {})).toBe(false)
    expect(runValidation(target, [])).toBe(false)
    expect(runValidation(target, {a: 10, b: [5, 'test']})).toBe(true)
    expect(runValidation(target, {a: 10, b: [5]})).toBe(false)
    expect(runValidation(target, {a: 10, b: [5, 'test', true]})).toBe(false)
})

test('run a union of object types', () => {
    const o1 = ObjectType.Of({
        kind: LiteralStringType.Of('o1'),
        a: numberType,
        b: stringType,
    })
    const o2 = ObjectType.Of({
        kind: LiteralStringType.Of('o2'),
        a: numberType,
        b: numberType,
    })
    const target = UnionType.Of([o1, o2])
    expect(runValidation(target, {kind: 'o1', a: 10, b: ''})).toBe(true)
    expect(runValidation(target, {kind: 'o2', a: 10, b: ''})).toBe(false)
    expect(runValidation(target, {kind: 'o2', a: 10, b: 20})).toBe(true)
})
