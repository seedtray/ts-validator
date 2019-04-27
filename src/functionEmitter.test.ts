import {FunctionEmitter} from './functionEmitter'
import {
    LiteralStringType,
    NamedType,
    nullableType,
    nullType,
    ObjectType,
    stringType,
    UnionType,
} from './types'

const fnEmitter = new FunctionEmitter()

test('emit validator for null', () => {
    const namedNull = NamedType.Of('Null', 'unknown', false, nullType)
    expect(fnEmitter.typeToFunctionSource(namedNull, false)).toMatchSnapshot()
    expect(fnEmitter.typeToFunctionSource(namedNull, true)).toMatchSnapshot()
})

test('emit validator for reasonably complicated object type', () => {
    const toValidate = NamedType.Of(
        'Lead',
        'unknown',
        false,
        ObjectType.Of({
            name: stringType,
            address: nullableType(stringType),
            kind: UnionType.Of([
                LiteralStringType.Of('business'),
                LiteralStringType.Of('person'),
            ]),
        }),
    )
    expect(fnEmitter.typeToFunctionSource(toValidate)).toMatchSnapshot()
})
