/**
 * Simple command line script for interacting with the working parts of
 * the validator.
 */
import * as path from 'path'
import * as ts from 'typescript'
import * as winston from 'winston'

import {isNil} from '../errors'
import {FunctionEmitter} from '../functionEmitter'
import {SimpleFileLocator, TypeMapper} from '../typeParser'
import {TypePrettyPrinter} from '../typePrettyPrinter'
import {NamedType} from '../types'
import {typeToValidation} from '../typeToValidation'
import {validationToJavascriptSource} from '../validationToJavascriptSource'

function main(): void {
    const logger = winston.createLogger()
    const filename = process.argv[2]
    const typeName = process.argv[3]
    const options = {
        target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, strict: true,
    }
    const program = ts.createProgram([filename], options)
    const locator = new SimpleFileLocator(program)
    const node = locator.find(filename, typeName)
    if (isNil(node)) {
        logger.error('Type %s not found in %s', typeName, filename)

        return
    }
    const typeOfNode = program.getTypeChecker().getTypeAtLocation(node)
    const mapper = new TypeMapper(program)

    // probably mapper.resolve should return a NamedType since it all starts with a name.
    const typeToValidate = mapper.resolve(typeOfNode) as any as NamedType
    const functionEmitter = new FunctionEmitter()
    const validationFunctionSource = functionEmitter.typeToFunctionSource(typeToValidate)
    process.stdout.write(validationFunctionSource + '\n')
}

main()
