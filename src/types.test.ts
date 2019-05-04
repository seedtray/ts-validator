import {TypePrettyPrinter} from './typePrettyPrinter'
import {
    ArrayType,
    booleanType,
    EnumType,
    IntersectionType,
    LiteralBooleanType,
    LiteralNumberType,
    LiteralStringType,
    NamedType,
    nullType,
    numberType,
    ObjectType,
    stringType,
    TupleType,
    Type,
    undefinedType,
    UnionType,
} from './types'

const ppVisitor = new TypePrettyPrinter()

function prettyPrintType(t: Type): string {
    return t.accept(ppVisitor).toString()
}

test('types are equal to themselves, but not equal to other types or different declarations',
    () => {
        const types: Type[] = [
            numberType,
            stringType,
            booleanType,
            nullType,
            undefinedType,
            ObjectType.Of({}),
            ObjectType.Of({a: booleanType}),
            ArrayType.Of(nullType),
            ArrayType.Of(stringType),
            UnionType.Of([numberType, stringType]),
            UnionType.Of([nullType, stringType]),
            IntersectionType.Of([numberType, stringType]),
            IntersectionType.Of([nullType, stringType]),
            TupleType.Of([numberType, stringType]),
            EnumType.Of({a: 10, b: 'test'}),
            EnumType.Of({a: 20, b: 'test'}),
            LiteralStringType.Of('test'),
            LiteralStringType.Of('another'),
            LiteralNumberType.Of(10),
            LiteralNumberType.Of(20),
            LiteralBooleanType.Of(true),
            LiteralBooleanType.Of(false),
            NamedType.Of('test', 'module', true, numberType),
            NamedType.Of('another', 'module', true, numberType),
        ]
        for (let i = 0; i < types.length; i++) {
            const base = types[i]
            expect(base.equalDeclaration(base)).toBe(true)
            for (const candidate of types.slice(0, i).concat(types.slice(i + 1, types.length))) {
                if (base.equalDeclaration(candidate)) {
                    const ppBase = prettyPrintType(base)
                    const ppCandidate = prettyPrintType(candidate)
                    throw new Error(`types are equal but should not: ${ppBase}\n ${ppCandidate}`)
                }
                expect(base.equalDeclaration(candidate)).toBe(false)
            }
        }
    }
)

test('Intersection and union types are equal disregarding their parts order', () => {
    expect(
        UnionType.Of([stringType, numberType]).equalDeclaration(
            UnionType.Of([numberType, stringType])
        )
    ).toBe(true)
    expect(
        IntersectionType.Of([stringType, numberType]).equalDeclaration(
            IntersectionType.Of([numberType, stringType])
        )
    ).toBe(true)
})
