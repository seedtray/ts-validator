/**
 * Parse ts types, by using the typescript type checker and converting from it's AST to
 * our type definitions.
 */
import * as ts from 'typescript'

import {checkNotNil, fail} from './errors'
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
    TupleType,
    Type,
    undefinedType,
    UnionType,
} from './types'

// tslint:disable:completed-docs

interface TypescriptTypeToValidatorType {
    resolve(tsType: ts.Type, node: ts.Node): Type
}

export class TypeParser {
    private mapper: TypeMapper

    constructor(private program: ts.Program) {
        this.mapper = new TypeMapper(program)
    }

    parseType(filename: string, typeName: string): NamedType {
        const checker = this.program.getTypeChecker()
        const node = checkNotNil(this.find(filename, typeName))
        const tsType = checker.getTypeAtLocation(node)
        const mappedType = this.mapper.resolve(tsType)
        return NamedType.Of(typeName, filename, true, mappedType)
    }

    private find(filename: string, lookupName: string): ts.Node | undefined {
        const sourceFile = checkNotNil(this.program.getSourceFile(filename))

        return ts.forEachChild(sourceFile, node => this.visitTopLevel(node, lookupName))
    }

    private visitTopLevel(node: ts.Node, lookupName: string): ts.Node | undefined {
        // if (!this.isTopLevelNodeExported(node)) {
        //     return
        // }
        if (ts.isInterfaceDeclaration(node) && node.name.escapedText === lookupName) {
            return node
        }
        if (ts.isTypeAliasDeclaration(node) && node.name.escapedText === lookupName) {
            return node
        }
    }

    // private isTopLevelNodeExported(node: ts.Node): boolean {
    //     return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0
    // }
}

function sortByName(propertiesOfType: ts.Symbol[]): ts.Symbol[] {
    return propertiesOfType.sort((a: ts.Symbol, b: ts.Symbol): number => {
        if (a.name < b.name) {
            return 1
        } else if (a.name > b.name) {
            return -1
        } else {
            return fail('not expecting two equally named properties')
        }
    })
}

export class TypeMapper implements TypescriptTypeToValidatorType {
    private checker: ts.TypeChecker

    constructor(private program: ts.Program) {
        this.checker = program.getTypeChecker()
    }

    // tslint:disable:no-bitwise
    resolve(tsType: ts.Type): Type {
        if (tsType.flags & ts.TypeFlags.Null) {
            return nullType
        } else if (tsType.flags & ts.TypeFlags.Undefined) {
            return undefinedType
        } else if (tsType.flags & ts.TypeFlags.Number) {
            return numberType
        } else if (tsType.flags & ts.TypeFlags.String) {
            return stringType
        } else if (tsType.flags & ts.TypeFlags.Boolean) {
            return booleanType
        } else if (this.isObjectType(tsType)) {
            return this.dispatchObjectTypes(tsType)
        } else if (this.isIntersectionType(tsType)) {
            return this.mapIntersectionOfTypes(tsType.types)
        } else if (this.isLiteralType(tsType)) {
            return this.mapLiteralType(tsType)
        } else if (this.isUnionType(tsType)) {
            return this.mapUnionOfTypes(tsType.types)
        } else {
            return fail(`Unknown type flags ${tsType.flags}`)
        }
    }

    private isLiteralType(tsType: ts.Type): tsType is ts.LiteralType {
        return !!(tsType.flags & ts.TypeFlags.Literal)
    }

    private isIntersectionType(tsType: ts.Type): tsType is ts.IntersectionType {
        return !!(tsType.flags & ts.TypeFlags.Intersection)
    }

    private isUnionType(tsType: ts.Type): tsType is ts.UnionType {
        return !!(tsType.flags & ts.TypeFlags.Union)
    }

    private mapArrayType(tsType: ts.Type): Type {
        return ArrayType.Of(this.resolve(tsType))
    }

    private mapObjectType(tsType: ts.Type): Type {
        const mapped = new ObjectType()
        const properties = sortByName(this.checker.getPropertiesOfType(tsType))
        for (const property of properties) {
            const propertyNode = checkNotNil(property.valueDeclaration)
            const propertyType = this.checker.getTypeOfSymbolAtLocation(property, propertyNode)
            const mappedType = this.resolve(propertyType)
            if (mappedType) {
                mapped.addProperty(property.name, mappedType)
            }
        }
        return mapped
    }

    private mapUnionOfTypes(tsTypes: ts.Type[]): Type {
        return UnionType.Of(tsTypes.map(tsType => this.resolve(tsType)))
    }

    private mapIntersectionOfTypes(tsTypes: ts.Type[]): Type {
        return IntersectionType.Of(tsTypes.map(tsType => this.resolve(tsType)))

    }

    private mapLiteralType(tsType: ts.LiteralType): Type {
        if (tsType.flags & ts.TypeFlags.NumberLiteral) {
            return LiteralNumberType.Of(tsType.value as number)
        }
        if (tsType.flags & ts.TypeFlags.StringLiteral) {
            return LiteralStringType.Of(tsType.value as string)

        }
        if (tsType.flags & ts.TypeFlags.BooleanLiteral) {
            return LiteralBooleanType.Of((tsType as any).intrinsicName === 'true')
        }

        return fail('unknown literal kind')
    }

    private isArrayType(tsType: ts.TypeReference): boolean {
        return tsType.symbol ? tsType.symbol.escapedName === 'Array' : false
    }

    private isTypeReference(tsType: ts.ObjectType): tsType is ts.TypeReference {
        return (tsType.objectFlags & ts.ObjectFlags.Reference) !== 0
    }

    private isTupleType(tsType: ts.TypeReference): boolean {
        return (tsType.target.objectFlags & ts.ObjectFlags.Tuple) !== 0
    }

    private isFunctionType(tsType: ts.Type): boolean {
        return (tsType.getCallSignatures().length > 0)
    }

    private isObjectType(tsType: ts.Type): tsType is ts.ObjectType {
        return (tsType.flags & ts.TypeFlags.Object) !== 0
    }

    private mapTypeReference(tsType: ts.TypeReference): Type {
        return this.mapObjectType(tsType)
    }

    private mapTupleType(tsType: ts.TypeReference): Type {
        const positionalTypes = checkNotNil(tsType.typeArguments).map(
            argument => this.resolve(argument)
        )

        return TupleType.Of(positionalTypes)
    }

    private dispatchObjectTypes(tsType: ts.ObjectType): Type {
        if (this.isTypeReference(tsType)) {
            if (this.isArrayType(tsType)) {
                return this.mapArrayType(checkNotNil(tsType.typeArguments)[0])
            } else if (this.isTupleType(tsType)) {
                return this.mapTupleType(tsType)
            }

            return this.mapTypeReference(tsType)
        } else if (this.isFunctionType(tsType)) {
            return fail('Cannot validate function type')
        } else {
            return this.mapObjectType(tsType)
        }

    }

    // tslint:enable:no-bitwise
}
