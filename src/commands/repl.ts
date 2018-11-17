/**
 * Simple command line script for interacting with the working parts of
 * the validator.
 */
import * as path from 'path'
import * as ts from 'typescript'

import {ExpressionEmitter} from '../expressionEmitter'
import {SimpleFileLocator, TypeMapper} from '../typeParser'
import {TypePrettyPrinter} from '../typePrettyPrinter'
import {ValidationGenerator} from '../validation'

//tslint:disable:no-console
function main(): void {
    const filename = process.argv[2]
    const typeName = process.argv[3]
    const options = {
        target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS, strict: true,
    }
    const program = ts.createProgram([filename], options)
    const locator = new SimpleFileLocator(program)
    const node = locator.find(filename, typeName)
    if (!node) {
        console.log('not found')

        return
    }
    const typeOfNode = program.getTypeChecker().getTypeAtLocation(node)
    const mapper = new TypeMapper(program)
    const validationType = mapper.resolve(typeOfNode)
    const pretty = validationType.accept(new TypePrettyPrinter())
    console.log(pretty.toString())
    const validation = validationType.accept(new ValidationGenerator())
    const validator = validation.accept(new ExpressionEmitter('value'))
    console.log(validator)
}

main()
