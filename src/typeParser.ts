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
    RecursiveReferenceType,
    stringType,
    TupleType,
    Type,
    undefinedType,
    UnionType
} from './types'
import {checkNotNil, checkState, fail, isNil} from './errors'

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
        return ts.forEachChild(sourceFile,
            node => this.visitTopLevel(node, lookupName)
        )
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

function sortByName(propertiesOfType: ts.Symbol[]) {
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

    push(type: ts.Type): void {
        checkState(!this.has(type))
        this.stack.push(type)
        this.visiting.add(type)
    }

    pop(): void {
        const type = checkNotNil(this.stack.pop())
        this.visiting.delete(type)
    }

    has(type: ts.Type): boolean {
        return this.visiting.has(type)
    }
}

class RecursiveTypeRegistry {
    recursiveTypesBySource: Map<ts.Type, Type>
    pendingReferences: Map<ts.Type, RecursiveReferenceType[]>

    constructor() {
        this.recursiveTypesBySource = new Map()
        this.pendingReferences = new Map()
    }

    addMaybeRecursiveType(source: ts.Type, resolved: Type): Type{
        if (this.isRecursive(source)) {
            this.addKnownRecursiveType(source, resolved)
            return new RecursiveReferenceType(resolved)
        }
        return resolved
    }

    makeRecursiveReference(source: ts.Type): RecursiveReferenceType {
        if (this.recursiveTypesBySource.has(source)) {
            return new RecursiveReferenceType(checkNotNil(this.recursiveTypesBySource.get(source)))
        }
        return this.makePendingRecursiveReference(source)
    }

    addKnownRecursiveType(source: ts.Type, type: Type): void {
        checkState(!this.recursiveTypesBySource.has(source))
        this.recursiveTypesBySource.set(source, type)
        this.resolvePendingReferences(source)
    }

    private isRecursive(source: ts.Type): boolean {
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
        const refOrType = this.recursiveTypes.addMaybeRecursiveType(source, resolved)
        stack.pop()
        return refOrType
    }

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
        const mapped = this.internalMap(tsType, stack)
        if (mapped) {
            return ArrayType.of(mapped)
        }
        return fail()
    }

    private mapObjectType(tsType: ts.Type, stack: TypeStack): Type {
        const type = new ObjectType(this.checker.typeToString(tsType))
        const properties = sortByName(this.checker.getPropertiesOfType(tsType))
        for (const property of properties) {
            const propertyNode = property.valueDeclaration!
            const propertyType = this.checker.getTypeOfSymbolAtLocation(property, propertyNode)
            const mappedType = this.internalMap(propertyType, stack)
            if (mappedType) {
                type.addProperty(property.name, mappedType)
            }
        }
        return type
    }

    private mapUnionOfTypes(tsTypes: Array<ts.Type>, stack: TypeStack): Type {
        return UnionType.of(tsTypes.map(tsType => this.internalMap(tsType, stack)))
    }

    private mapIntersectionOfTypes(tsTypes: Array<ts.Type>, stack: TypeStack): Type {
        return IntersectionType.of(tsTypes.map(tsType => this.internalMap(tsType, stack)))

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

    private mapTypeReference(tsType: ts.TypeReference, stack: TypeStack): Type {
        return this.mapObjectType(tsType, stack)
    }

    private mapTupleType(tsType: ts.TypeReference, stack: TypeStack): Type {
        const tuple = new TupleType()
        const tupleTypes = checkNotNil(tsType.typeArguments)
        for (const argument of tupleTypes) {
            tuple.add(this.internalMap(argument, stack))
        }
        return tuple
    }

    private dispatchObjectTypes(tsType: ts.ObjectType, stack: TypeStack) {
        if (this.isTypeReference(tsType)) {
            if (this.isArrayType(tsType)) {
                return this.mapArrayType(tsType.typeArguments![0], stack)
            } else if (this.isTupleType(tsType)) {
                return this.mapTupleType(tsType, stack)
            }
            return this.mapTypeReference(tsType, stack)
        } else if (this.isFunctionType(tsType)) {
            return fail('Cannot validate function type')
        }
        return this.mapObjectType(tsType, stack)
    }
}

