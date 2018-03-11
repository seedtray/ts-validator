import 'jest'
import {TypePrettyPrinter} from 'typePrettyPrinter.ts'
import {
    ArrayType, booleanType, EnumType, IntersectionType, nullType, numberType, ObjectType,
    stringType, TupleType,
    undefinedType, UnionType
} from './types'

const pp = new TypePrettyPrinter()
test('pretty prints basic types', () => {
    expect(numberType.accept(pp).toString()).toBe('number')
    expect(booleanType.accept(pp).toString()).toBe('boolean')
    expect(stringType.accept(pp).toString()).toBe('string')
    expect(nullType.accept(pp).toString()).toBe('null')
    expect(undefinedType.accept(pp).toString()).toBe('undefined')
})
test('pretty prints tuples', () => {
    expect(TupleType.of([numberType, stringType]).accept(pp).toString())
        .toBe('[number, string]')
})
test('short pretty prints arrays', () => {
    expect(ArrayType.of(numberType).accept(pp).toString()).toBe('number[]')
})
test('prints more complex arrays', () => {
    expect(
        ArrayType.of(
            TupleType.of([numberType])
        ).accept(pp).toString()).toBe('Array<[number]>')
})
test('pretty print union types', () => {
    expect(UnionType.of([numberType, booleanType]).accept(pp).toString())
        .toBe('number | boolean')
})
test('pretty print intersection types', () => {
    expect(IntersectionType.of([numberType, booleanType]).accept(pp).toString())
        .toBe('number & boolean')
})
test('pretty prints enums', () => {
    const enumType = new EnumType()
    enumType.add('test', 1)
    enumType.add('another', 2)
    enumType.add('aString', 'test')
    expect(enumType.accept(pp).toString()).toBe(
        `Enum(\n  test=1,\n  another=2,\n  aString='test',\n)`)
})
test('pretty prints simple objects', () => {
    const ot = new ObjectType()
    ot.add('a', numberType)
    ot.add('b', TupleType.of([numberType, stringType]))
    expect(ot.accept(pp).toString()).toBe(
        `{\n  a: number\n  b: [number, string]\n}`
    )
})

test('pretty nested objects', () => {
    const nested = ObjectType.of({o2: nullType})
    const ot = ObjectType.of({
        a: numberType,
        b: TupleType.of([numberType, stringType]),
        ot2: nested,
        at: ArrayType.of(nested)
    })
    expect(ot.accept(pp).toString()).toBe([
        '{',
        '  a: number',
        '  b: [number, string]',
        '  ot2: {',
        '    o2: null',
        '  }',
        '  at: Array<{',
        '    o2: null',
        '  }>',
        '}',
    ].join('\n'))
})
