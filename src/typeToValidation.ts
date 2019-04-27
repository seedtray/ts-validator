import {fail} from './errors'
import {
    ArrayType,
    EnumType,
    IntersectionType,
    LiteralBooleanType,
    LiteralNumberType,
    LiteralStringType,
    NamedType,
    ObjectType,
    PrimitiveType,
    PrimitiveTypes,
    RecursiveReferenceType,
    TupleType,
    Type,
    TypeVisitor,
    UnionType,
} from './types'
import {
    AllRequiredValidation,
    ArrayElementsValidation,
    ArrayElementValidation,
    CommonValidation,
    CommonValidations,
    EnumValueValidation,
    PreconditionValidation,
    PrimitiveBooleanValidation,
    PrimitiveNumberValidation,
    PrimitiveStringValidation,
    PropertyValidation,
    RecursiveValidation,
    ReferencableValidation,
    SomeRequiredValidation,
    Validation,
} from './validation'

/**
 * A type visitor that generates a Validation.
 */
export class TypeToValidationVisitor implements TypeVisitor<Validation> {

    visitPrimitive(primitive: PrimitiveType): CommonValidation {
        return new CommonValidation(this.getCommonValidations(primitive.target))
    }

    visitObject(o: ObjectType): Validation {
        return new PreconditionValidation(
            new CommonValidation(CommonValidations.isObject),
            new AllRequiredValidation(Array.from(this.objectPropertiesValidation(o.properties)))
        )
    }

    visitArray(a: ArrayType): Validation {
        return new PreconditionValidation(
            new CommonValidation(CommonValidations.isArray),
            new ArrayElementsValidation(a.target.accept(this))
        )
    }

    visitUnion(u: UnionType): Validation {
        return new SomeRequiredValidation(u.target.map(target => target.accept(this)))
    }

    visitIntersection(i: IntersectionType): Validation {
        return new AllRequiredValidation(i.target.map(target => target.accept(this)))
    }

    visitTuple(t: TupleType): Validation {
        const elementValidations = t.target.map(
            (target, i) => new ArrayElementValidation(i, target.accept(this))
        )

        return new PreconditionValidation(
            new AllRequiredValidation(
                [
                    new CommonValidation(CommonValidations.isArray),
                    new PropertyValidation(
                        'length',
                        new PrimitiveNumberValidation(t.target.length)
                    ),
                ]),
            new AllRequiredValidation(elementValidations),
        )
    }

    visitEnum(t: EnumType): Validation {
        return new EnumValueValidation()
    }

    visitLiteralString(literal: LiteralStringType): Validation {
        return new PrimitiveStringValidation(literal.value)
    }

    visitLiteralNumber(literal: LiteralNumberType): Validation {
        return new PrimitiveNumberValidation(literal.value)
    }

    visitLiteralBoolean(literal: LiteralBooleanType): Validation {
        return new PrimitiveBooleanValidation(literal.value)
    }

    visitRecursiveReference(ref: RecursiveReferenceType): Validation {
        return new RecursiveValidation(ref.getTarget())
    }

    visitNamedType(udt: NamedType): Validation {
        return new ReferencableValidation(udt, udt.target.accept(this))
    }

    private getCommonValidations(primitiveType: PrimitiveTypes): CommonValidations {
        switch (primitiveType) {
            case 'number':
                return CommonValidations.isNumber
            case 'boolean':
                return CommonValidations.isBoolean
            case 'null':
                return CommonValidations.isNull
            case 'undefined':
                return CommonValidations.isUndefined
            case 'string':
                return CommonValidations.isString
            default:
                return fail()
        }
    }

    private* objectPropertiesValidation(properties: Map<string, Type>): IterableIterator<Validation> {
        for (const [property, type] of properties.entries()) {
            yield new PropertyValidation(property, type.accept(this))
        }
    }
}

/**
 * Generate a Validator for a given Type.
 *
 * Just a convenience function over TypeToValidationVisitor()
 */
export function typeToValidation(t: Type): Validation {
    return t.accept(new TypeToValidationVisitor())
}
