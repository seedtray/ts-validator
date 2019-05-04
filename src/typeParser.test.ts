import * as ts from 'typescript'

import {TypeParser} from './typeParser'
import {TypePrettyPrinter} from './typePrettyPrinter'
import {
    ArrayType,
    booleanType,
    IntersectionType,
    LiteralBooleanType,
    LiteralNumberType,
    LiteralStringType,
    NamedType,
    nullType,
    numberType,
    ObjectType,
    stringType,
    Type, UnionType,
} from './types'

const INLINE_MODULE = 'inline.ts'

function parseTypeFromSource(typeName: string, source: string): NamedType {
    // this shares a bunch of setup from repl, meaning it should all be better encapsulated
    // by typeParser

    const fakeSourceFile = ts.createSourceFile('inline.ts', source, ts.ScriptTarget.ES5)
    const compilerHost = ts.createCompilerHost({})
    const fallbackGetSourceFile = compilerHost.getSourceFile
    compilerHost.getSourceFile = (
        fileName: string, languageVersion: ts.ScriptTarget,
        onError?: (message: string) => void,
        shouldCreateNewSourceFile?: boolean
    ): ts.SourceFile | undefined => {
        if (fileName === INLINE_MODULE) {
            return fakeSourceFile
        }
        return fallbackGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)

    }
    const program = ts.createProgram([INLINE_MODULE], {}, compilerHost)
    const parser = new TypeParser(program)
    return parser.parseType(INLINE_MODULE, typeName)
}

function prettyPrintType(type: Type): string {
    const prettyPrinter = new TypePrettyPrinter()
    return type.accept(prettyPrinter).toString()
}

function expectProperlyParsedType(typeName: string, snippet: string, expected: Type): void {
    const namedExpected = NamedType.Of(typeName, INLINE_MODULE, true, expected)
    const parsed = parseTypeFromSource(typeName, snippet)

    if (!parsed.equalDeclaration(namedExpected)) {
        const ppParsed = prettyPrintType(parsed.target)
        const ppExpected = prettyPrintType(expected)
        throw new Error(`types don't match:\n${ppParsed}\n${ppExpected}`)
    }
}

test('Array of numbers within an object gets properly parsed', () => {
    expectProperlyParsedType(
        'Sample',
        `export interface Sample { scores: number[] }`,
        ObjectType.Of({scores: ArrayType.Of(numberType)}
        )
    )
})

test('assorted basic types are properly parsed', () => {
    expectProperlyParsedType('Sample', `export type Sample = null`, nullType)
    expectProperlyParsedType('Sample', `
        export interface Sample {
            c: number
            a: string
            d: boolean
        }
    `, ObjectType.Of({
        c: numberType,
        a: stringType,
        d: booleanType,
    }))
    expectProperlyParsedType(
        'Sample',
        `export type Sample = number & string`,
        IntersectionType.Of([numberType, stringType])
    )
    expectProperlyParsedType(
        'Sample',
        `export type Sample = number | string`,
        UnionType.Of([numberType, stringType])
    )
    expectProperlyParsedType('Sample', `export type Sample = 'test'`, LiteralStringType.Of('test'))
    expectProperlyParsedType('Sample', `export type Sample = 10`, LiteralNumberType.Of(10))
    expectProperlyParsedType('Sample', `export type Sample = true`, LiteralBooleanType.Of(true))
})
