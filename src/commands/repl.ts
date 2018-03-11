const appModulePath = require("app-module-path")
import * as path from 'path'

appModulePath.addPath(path.resolve(__dirname, '../'))

import {ExpressionEmitter} from 'expressionEmitter'
import {ValidationGenerator} from 'validation'
import {TypePrettyPrinter} from 'typePrettyPrinter'
import * as ts from 'typescript'
import {SimpleFileLocator, TypeMapper} from 'typeParser'

function main() {
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
    const validationType = mapper.map(typeOfNode)
    const pretty = validationType.accept(new TypePrettyPrinter())
    console.log(pretty.toString())
    const validation = validationType.accept(new ValidationGenerator())
    const validator = validation.accept(new ExpressionEmitter('value'))
    console.log(validator)
}

main()
