import {checkArgument} from './errors'
import {capitalize, unindent} from './stringUtils'
import {NamedType, Type} from './types'
import {typeToValidation} from './typeToValidation'
import {validationToJavascriptSource} from './validationToJavascriptSource'

/**
 * Emit validating functions.
 * for a type T, emit isT(value: unknown): value is T
 */
export class FunctionEmitter {

    typeToFunctionSource(t: NamedType, exportFunction: boolean = false): string {
        const expression = validationToJavascriptSource(typeToValidation(t.target), 'value')
        const functionName = this.getFunctionName(t.name)
        const exportPrefix = exportFunction ? 'export ' : ''

        return unindent(`
        ${exportPrefix}function ${functionName}(value: unknown): value is ${t.name} {
            return ${expression}
        }
        `)
    }

    private getFunctionName(typeName: string): string {
        const capitalizedTypeName = capitalize(typeName)

        return `is${capitalizedTypeName}`
    }
}
