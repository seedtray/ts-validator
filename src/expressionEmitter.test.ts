import {ExpressionEmitter} from 'expressionEmitter'
import {
    LiteralStringType,
    numberType,
    ObjectType,
    PrimitiveType,
    PrimitiveTypes,
    stringType,
    TupleType,
    Type,
    UnionType
} from 'types'
import {ValidationGenerator} from 'validation'
import {checkState} from 'errors'

function getAssignmentCode(name: string, value: any) {
    const valueRepr = JSON.stringify(value)
    return `var ${name} = ${valueRepr}`
}

function getEmittedCode(name: string, type: Type): string {
    const validatorGenerator = new ValidationGenerator()
    const rawEmitter = new ExpressionEmitter(name)
    const validator = type.accept(validatorGenerator)
    return validator.accept(rawEmitter)
}


function runValidation(type: Type, value: any): boolean {
    const variableName = 'v'
    const assignment = getAssignmentCode(variableName, value)
    const emittedValidation = getEmittedCode(variableName, type)
    const snippet = `${assignment};\n${emittedValidation}`
    const isValid: any = eval(snippet)
    checkState(typeof isValid === 'boolean')
    return isValid as boolean
}

test('basic number validator', () => {
    const type = new PrimitiveType(PrimitiveTypes.number)
    const emitted = getEmittedCode('n', type)
    expect(emitted).toBe("typeof n === 'number'")
})

test('object emitted code', () => {
    const type = ObjectType.of({
        a: numberType,
        b: TupleType.of([numberType, stringType])
    })
    expect(runValidation(type, null)).toBe(false)
    expect(runValidation(type, undefined)).toBe(false)
    expect(runValidation(type, true)).toBe(false)
    expect(runValidation(type, {})).toBe(false)
    expect(runValidation(type, [])).toBe(false)
    expect(runValidation(type, {a: 10, b: [5, 'test']})).toBe(true)
    expect(runValidation(type, {a: 10, b: [5]})).toBe(false)
    expect(runValidation(type, {a: 10, b: [5, 'test', true]})).toBe(false)
})

test('run a union of object types', () => {
    const o1 = ObjectType.of({
        kind: LiteralStringType.of('o1'),
        a: numberType,
        b: stringType,
    })
    const o2 = ObjectType.of({
        kind: LiteralStringType.of('o2'),
        a: numberType,
        b: numberType,
    })
    const type = UnionType.of([o1, o2])
    expect(runValidation(type, {kind: 'o1', a: 10, b: ''})).toBe(true)
    expect(runValidation(type, {kind: 'o2', a: 10, b: ''})).toBe(false)
    expect(runValidation(type, {kind: 'o2', a: 10, b: 20})).toBe(true)
})
