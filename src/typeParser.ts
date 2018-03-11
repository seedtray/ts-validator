import * as ts from 'typescript'
import {
    ArrayType,
    booleanType,
    IntersectionType,
    LiteralBooleanType,
    LiteralNumberType,
    LiteralStringType,
    nullType,
    numberType,
    ObjectType,
    stringType,
    TupleType,
    Type,
    undefinedType,
    UnionType
} from 'types'
import {checkNotNil, fail} from 'errors'

interface TypeLocator {
    find(filename: string, typeName: string): ts.Node | undefined
}

interface TypescriptTypeToValidatorType {
    map(tsType: ts.Type, node: ts.Node): Type
}

export class SimpleFileLocator implements TypeLocator {
    constructor(private program: ts.Program) {
    }

    find(filename: string, lookupName: string): ts.Node | undefined {
        const sourceFile = checkNotNil(this.program.getSourceFile(filename))
        return ts.forEachChild(sourceFile,
            node => this.visitTopLevel(node, lookupName)
        )
    }

    private visitTopLevel(node: ts.Node, lookupName: string): ts.Node | undefined {
        if (!this.isTopLevelNodeExported(node)) {
            return
        }
        if (ts.isInterfaceDeclaration(node) && node.name.escapedText === lookupName) {
            return node
        }
        if (ts.isTypeAliasDeclaration(node) && node.name.escapedText === lookupName) {
            return node
        }
    }

    // noinspection JSMethodCanBeStatic
    private isTopLevelNodeExported(node: ts.Node): boolean {
        return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0
    }
}

export class TypeMapper implements TypescriptTypeToValidatorType {
    private checker: ts.TypeChecker

    constructor(private program: ts.Program) {
        this.checker = program.getTypeChecker()
    }

    map(tsType: ts.Type): Type {
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
        const mapped = this.map(tsType)
        if (mapped) {
            return ArrayType.of(mapped)
        }
        return fail()
    }

    private mapObjectType(tsType: ts.Type): Type {
        const type = new ObjectType()
        for (const property of this.checker.getPropertiesOfType(tsType)) {
            const propertyNode = property.valueDeclaration!
            const propertyType = this.checker.getTypeOfSymbolAtLocation(property, propertyNode)
            const mappedType = this.map(propertyType)
            if (mappedType) {
                type.add(property.name, mappedType)
            }
        }
        return type
    }

    private mapUnionOfTypes(tsTypes: Array<ts.Type>): Type {
        return UnionType.of(tsTypes.map(tsType => this.map(tsType)))
    }

    private mapIntersectionOfTypes(tsTypes: Array<ts.Type>): Type {
        return IntersectionType.of(tsTypes.map(tsType => this.map(tsType)))

    }

    private mapLiteralType(tsType: ts.LiteralType): Type {
        if (tsType.flags & ts.TypeFlags.NumberLiteral) {
            return LiteralNumberType.of(tsType.value as number)
        }
        if (tsType.flags & ts.TypeFlags.StringLiteral) {
            return LiteralStringType.of(tsType.value as string)

        }
        if (tsType.flags & ts.TypeFlags.BooleanLiteral) {
            return LiteralBooleanType.of((tsType as any).intrinsicName === 'true')
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

    private mapTupleType(tsType: ts.GenericType): Type {
        const tuple = new TupleType()
        const tupleTypes = checkNotNil(tsType.typeArguments)
        for (const argument of tupleTypes) {
            tuple.add(this.map(argument))
        }
        return tuple
    }

    private dispatchObjectTypes(tsType: ts.ObjectType) {
        if (this.isTypeReference(tsType)) {
            if (this.isArrayType(tsType)) {
                return this.mapArrayType(tsType.typeArguments![0])
            } else if (this.isTupleType(tsType)) {
                return this.mapTupleType(tsType.target)
            }
            return this.mapTypeReference(tsType)
        } else if (this.isFunctionType(tsType)) {
            return fail('Cannot validate function type')
        }
        return this.mapObjectType(tsType)
    }
}

