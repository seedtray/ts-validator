/**
 * Simple command line script for interacting with the working parts of
 * the validator.
 */
import * as path from 'path'
import * as ts from 'typescript'
import * as winston from 'winston'

import {isNil} from '../errors'
import {ExpressionEmitter} from '../expressionEmitter'
import {SimpleFileLocator, TypeMapper} from '../typeParser'
import {TypePrettyPrinter} from '../typePrettyPrinter'
import {ValidationGenerator} from '../validation'

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
    const validationType = mapper.resolve(typeOfNode)
    const formatted = validationType.accept(new TypePrettyPrinter()).toString()
    process.stdout.write(`${formatted}\n`)
    const validation = validationType.accept(new ValidationGenerator())
    const validatorExpression = validation.accept(new ExpressionEmitter('value'))
    process.stdout.write(`${validatorExpression}\n`)
}

main()
