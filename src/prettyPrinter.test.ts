//tslint:disable-next-line:missing-jsdoc no-implicit-dependencies no-import-side-effect
import 'jest'

import {unindent} from './stringUtils'
import {TypePrettyPrinter} from './typePrettyPrinter'
import {
    ArrayType,
    booleanType,
    EnumType,
    IntersectionType, NamedType,
    nullType,
    numberType,
    ObjectType,
    RecursiveReferenceType,
    stringType,
    TupleType,
    undefinedType,
    UnionType,
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
    expect(TupleType.Of([numberType, stringType]).accept(pp).toString())
        .toBe('[number, string]')
})
test('short pretty prints arrays', () => {
    expect(ArrayType.Of(numberType).accept(pp).toString()).toBe('number[]')
})
test('prints more complex arrays', () => {
    expect(
        ArrayType.Of(
            TupleType.Of([numberType])
        ).accept(pp).toString()).toBe('Array<[number]>')
})
test('pretty print union types', () => {
    expect(UnionType.Of([numberType, booleanType]).accept(pp).toString())
        .toBe('number | boolean')
})
test('pretty print intersection types', () => {
    expect(IntersectionType.Of([numberType, booleanType]).accept(pp).toString())
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
    ot.addProperty('a', numberType)
    ot.addProperty('b', TupleType.Of([numberType, stringType]))
    expect(ot.accept(pp).toString()).toBe(
        `{\n  a: number\n  b: [number, string]\n}`
    )
})

test('pretty nested objects', () => {
    const nested = ObjectType.Of({o2: nullType})
    const ot = ObjectType.Of({
                                 a: numberType,
                                 b: TupleType.Of([numberType, stringType]),
                                 ot2: nested,
                                 at: ArrayType.Of(nested),
                             })
    expect(ot.accept(pp).toString()).toBe(unindent(
        `
        {
          a: number
          b: [number, string]
          ot2: {
            o2: null
          }
          at: Array<{
            o2: null
          }>
        }`))
})

test('pretty recursive types', () => {
    const rec32 = new RecursiveReferenceType(null)
    const rec31 = RecursiveReferenceType.Of(
        NamedType.Of('Recursive31', 'test', true, ObjectType.Of({a: rec32}))
    )
    const rec33 = RecursiveReferenceType.Of(
        NamedType.Of('Recursive33', 'test', true, ObjectType.Of({d: rec31}))
    )
    rec32.resolve(NamedType.Of('Recursive32', 'test', true, ObjectType.Of({b: rec32, c: rec33})))

    const rec1 = RecursiveReferenceType.Of(
        NamedType.Of('CompositionWithRecursive', 'test', true, ObjectType.Of({t: rec33}))
    )
    expect(rec1.accept(pp).toString()).toBe(unindent(
        `
        { [CompositionWithRecursive]
          t: { [Recursive33]
            d: { [Recursive31]
              a: { [Recursive32]
                b: RecursiveReference<Recursive32>
                c: RecursiveReference<Recursive33>
              }
            }
          }
        }`
    ))
})
