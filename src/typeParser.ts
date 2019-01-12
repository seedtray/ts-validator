/**
 * Parse ts types, by using the typescript type checker and converting from it's AST to
 * our type definitions.
 */
import * as ts from 'typescript'

import {assert, checkNotNil, checkState, fail, isNil} from './errors'
import {
    booleanType,
    IntersectionType,
    LiteralBooleanType,
    LiteralNumberType,
    LiteralStringType, NamedType,
    nullType,
    numberType,
    ObjectType,
    RecursiveReferenceType,
    stringType,
    TupleType,
    Type,
    TypeName,
    undefinedType,
    UnionType,
} from './types'

interface TypeLocator {
    find(filename: string, typeName: string): ts.Node | undefined
}

interface TypescriptTypeToValidatorType {
    resolve(tsType: ts.Type, node: ts.Node): Type
}

export class SimpleFileLocator implements TypeLocator {
    constructor(private program: ts.Program) {
    }

    find(filename: string, lookupName: string): ts.Node | undefined {
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

export class TypeStack {
    private stack: ts.Type[]
    private visiting: Set<ts.Type>

    constructor() {
        this.stack = []
        this.visiting = new Set()
    }

    push(tsType: ts.Type): void {
        checkState(!this.has(tsType))
        this.stack.push(tsType)
        this.visiting.add(tsType)
    }

    pop(): void {
        const tsType = checkNotNil(this.stack.pop())
        this.visiting.delete(tsType)
    }

    has(tsType: ts.Type): boolean {
        return this.visiting.has(tsType)
    }
}

class RecursiveTypeRegistry {
    recursiveTypesBySource: Map<ts.Type, NamedType>
    pendingReferences: Map<ts.Type, RecursiveReferenceType[]>

    constructor() {
        this.recursiveTypesBySource = new Map()
        this.pendingReferences = new Map()
    }

    addMaybeRecursiveType(source: ts.Type, resolved: Type): Type {
        if (this.isRecursive(source)) {
            this.addKnownRecursiveType(source, resolved as any)

            return new RecursiveReferenceType(resolved as any)
        }

        return resolved
    }

    makeRecursiveReference(source: ts.Type): RecursiveReferenceType {
        if (this.recursiveTypesBySource.has(source)) {
            return new RecursiveReferenceType(checkNotNil(this.recursiveTypesBySource.get(source)))
        }

        return this.makePendingRecursiveReference(source)
    }

    addKnownRecursiveType(source: ts.Type, target: NamedType): void {
        checkState(!this.recursiveTypesBySource.has(source))
        this.recursiveTypesBySource.set(source, target)
        this.resolvePendingReferences(source)
    }

    isRecursive(source: ts.Type): boolean {
        return this.recursiveTypesBySource.has(source) || this.pendingReferences.has(source)
    }

    private makePendingRecursiveReference(source: ts.Type): RecursiveReferenceType {
        if (!this.pendingReferences.has(source)) {
            this.pendingReferences.set(source, [])
        }
        const ref = new RecursiveReferenceType(null)
        checkNotNil(this.pendingReferences.get(source)).push(ref)

        return ref
    }

    private resolvePendingReferences(source: ts.Type): void {
        const resolveTo = checkNotNil(this.recursiveTypesBySource.get(source))
        const pendingReferences = this.pendingReferences.get(source)
        if (isNil(pendingReferences)) {
            return
        }
        for (const ref of pendingReferences) {
            ref.resolve(resolveTo)
        }
        this.pendingReferences.delete(source)

    }
}

export class TypeMapper implements TypescriptTypeToValidatorType {
    private checker: ts.TypeChecker
    private recursiveTypes: RecursiveTypeRegistry

    constructor(private program: ts.Program) {
        this.checker = program.getTypeChecker()
        this.recursiveTypes = new RecursiveTypeRegistry()
    }

    resolve(tsType: ts.Type): Type {
        return this.internalMap(tsType, new TypeStack())
    }

    internalMap(source: ts.Type, stack: TypeStack): Type {
        if (stack.has(source)) {
            return this.recursiveTypes.makeRecursiveReference(source)
        }
        stack.push(source)
        const resolved = this.safeStepMap(source, stack)
        const resolvedWithMaybeName = this.makeMaybeNamedType(source, resolved)
        if (this.recursiveTypes.isRecursive(source)) {
            this.recursiveTypes.addKnownRecursiveType(source, resolvedWithMaybeName as any)
        }
        stack.pop()

        return resolvedWithMaybeName
    }

    private makeMaybeNamedType(source: ts.Type, target: Type): NamedType | Type {
        const tsSymbol = source.getSymbol()
        if (isNil(tsSymbol)) {
            return target
        } else {
            return new NamedType(tsSymbol.getName(), 'unknown', true, target)
        }
    }

    //tslint:disable:no-bitwise
    private safeStepMap(tsType: ts.Type, stack: TypeStack): Type {
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
            return this.dispatchObjectTypes(tsType, stack)
        } else if (this.isIntersectionType(tsType)) {
            return this.mapIntersectionOfTypes(tsType.types, stack)
        } else if (this.isLiteralType(tsType)) {
            return this.mapLiteralType(tsType)
        } else if (this.isUnionType(tsType)) {
            return this.mapUnionOfTypes(tsType.types, stack)
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

    private mapArrayType(tsType: ts.Type, stack: TypeStack): Type {
        return this.internalMap(tsType, stack)
    }

    private mapObjectType(tsType: ts.Type, stack: TypeStack): Type {
        const mapped = new ObjectType()
        const properties = sortByName(this.checker.getPropertiesOfType(tsType))
        for (const property of properties) {
            const propertyNode = checkNotNil(property.valueDeclaration)
            const propertyType = this.checker.getTypeOfSymbolAtLocation(property, propertyNode)
            const mappedType = this.internalMap(propertyType, stack)
            if (mappedType) {
                mapped.addProperty(property.name, mappedType)
            }
        }
        //TODO: resolve module path

        return NamedType.Of(
            this.checker.typeToString(tsType), 'unknown', true, mapped
        )
    }

    private mapUnionOfTypes(tsTypes: ts.Type[], stack: TypeStack): Type {
        return UnionType.Of(tsTypes.map(tsType => this.internalMap(tsType, stack)))
    }

    private mapIntersectionOfTypes(tsTypes: ts.Type[], stack: TypeStack): Type {
        return IntersectionType.Of(tsTypes.map(tsType => this.internalMap(tsType, stack)))

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

    private mapTypeReference(tsType: ts.TypeReference, stack: TypeStack): Type {
        return this.mapObjectType(tsType, stack)
    }

    private mapTupleType(tsType: ts.TypeReference, stack: TypeStack): Type {
        const positionalTypes = checkNotNil(tsType.typeArguments).map(
            argument => this.internalMap(argument, stack)
        )

        return TupleType.Of(positionalTypes)
    }

    private dispatchObjectTypes(tsType: ts.ObjectType, stack: TypeStack): Type {
        if (this.isTypeReference(tsType)) {
            if (this.isArrayType(tsType)) {
                return this.mapArrayType(checkNotNil(tsType.typeArguments)[0], stack)
            } else if (this.isTupleType(tsType)) {
                return this.mapTupleType(tsType, stack)
            }

            return this.mapTypeReference(tsType, stack)
        } else if (this.isFunctionType(tsType)) {
            return fail('Cannot validate function type')
        } else {
            return this.mapObjectType(tsType, stack)
        }

    }

    //tslint:enable:no-bitwise
}
