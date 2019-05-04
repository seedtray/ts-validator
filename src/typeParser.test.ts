import * as ts from 'typescript'

import {TypeParser} from './typeParser'
import {TypePrettyPrinter} from './typePrettyPrinter'
import {ArrayType, NamedType, numberType, ObjectType, Type} from './types'

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
    const locator = new TypeParser(program)
    return locator.parseType(INLINE_MODULE, typeName)
}

function prettyPrintType(type: Type): string {
    const prettyPrinter = new TypePrettyPrinter()
    return type.accept(prettyPrinter).toString()
}

test('Array of numbers within an object gets properly parsed', () => {

        const parsed = parseTypeFromSource('Sample', `
        export interface Sample {
            scores: number[]
        }`)
        const expected = NamedType.Of(
            'Sample',
            INLINE_MODULE,
            true,
            ObjectType.Of({scores: ArrayType.Of(numberType)})
        )

        expect(parsed.equalDeclaration(expected)).toBe(true)
    }
)
