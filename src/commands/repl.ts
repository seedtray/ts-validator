/**
 * Simple command line script for interacting with the working parts of
 * the validator.
 */
import * as ts from 'typescript'
import * as winston from 'winston'

import {FunctionEmitter} from '../functionEmitter'
import {TypeParser} from '../typeParser'

function main(): void {
    const logger = winston.createLogger()
    const filename = process.argv[2]
    const typeName = process.argv[3]
    const options = {
        target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, strict: true,
    }
    const program = ts.createProgram([filename], options)
    const locator = new TypeParser(program)
    const typeToValidate = locator.parseType(filename, typeName)
    const functionEmitter = new FunctionEmitter()
    const validationFunctionSource = functionEmitter.typeToFunctionSource(typeToValidate)
    process.stdout.write(validationFunctionSource + '\n')
}

main()
