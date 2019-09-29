import OrderedMap from '~/utils/OrderedMap';
import { Location } from '~/parser/Tokenizer';
import { Declaration } from '~/syntax';


/**
 * These flags drive the majority of type definition logic.
 * 
 * ## Normal types
 * 
 * Normal types are the base types of the language,
 * and consist of primitive types and structured types.
 * Primitive types are atomic types, and structured types
 * are types that are composed of other types.
 * Normal types can only ever be assignable to or from
 * their own kind, and may contain further properties that
 * determine assignability from there. 'char' and 'bool'
 * are the only types that do not have further properties.
 * Structured types contain other types, and have special
 * logic for how to determine assignability of those inner
 * types.
 * The flags for normal types determine whether the type
 * can be used as one of the normal types, i.e. whether
 * the type is assignable to the normal type.
 * If a type has multiple normal flags, then it can be
 * used as multiple kinds of types (intersection).
 * 
 * ## Union types
 * 
 * Union types are a kind of computed type that form types
 * that can be assigned from multiple kinds of types.
 * For example, the type 'int | string' can be assigned
 * either an int or a string. This is useful for when
 * multiple types can be used in a certain place. The
 * drawback of this is that while multiple types are
 * assignable to the union, the union itself is often
 * assignable to very few types, and very often is not
 * assignable to any type at all (except itself).
 * Because each flag indicates what type(s) a type is
 * assignable *to*, the flags do not support union types
 * out of the box. When a type is a union, the 'Union'
 * flag should be turned on, which effectively inverts
 * the meaning of all flags. Basically, a normal type flag
 * flipped on for a union type means that that type is *NOT*
 * included in the union. Any flag turned off *IS* included.
 * This means that when determining if a type is a kind of
 * normal type, if the type is a union, the expected flag
 * should be the only one turned off.
 * 
 * ## 'any'
 * 
 * 'any' is a built-in type that represents the union of
 * all types. Being this, it is assignable to only itself,
 * but all types are assignable to it. This is a short-circuit
 * check. When checking assignability, if the 'to' type is 'any',
 * the logic will automatically return true, even if the 'from'
 * type is structured. If the 'from' type is any, false will
 * be returned, unless the 'to' type is any.
 * 
 * ## 'never'
 * 
 * 'never' is a built-in type that represents the intersection
 * of all types. Being this, no types are assignable to it,
 * but it is assignable to all types. This is a short-circuit
 * check. When checking assignability, if the 'from' type is
 * 'never', the logic will automatically return true, even if
 * the 'to' type is structured. If the 'to' type is never, false
 * will be returned, unless the 'from' type is never.
 */
export const enum TypeFlags {
    // #region Primitives
    /** Type is an integer, sets properties 'signed' and 'size' */
    Integer = 1 << 0,
    /** Type is a float, set property 'size' */
    Float = 1 << 1,
    /** Type is a char */
    Char = 1 << 2,
    /** Type is a bool */
    Bool = 1 << 3,
    // #endregion

    // #region Structured
    /** Type is an array, sets property 'baseType' */
    Array = 1 << 4,
    /** Type is a struct, sets property 'fields' */
    Struct = 1 << 5,
    /** Type is a tuple, sets property 'tupleTypes' */
    Tuple = 1 << 6,
    /** Type is a function, sets properties 'paramTypes' and 'returnType' */
    Function = 1 << 7,
    // #endregion

    // #region Nuanced (special types that don't fit into the category of "normal")
    /** Type is any (union of all types) */
    Any = 1 << 8,
    /** Type is never (intersection of all types) */
    Never = 1 << 9,
    /** Type is inferred, sets property 'inference' */
    Inferred = 1 << 10,
    /** Type is unknown (assignable to/from all types) */
    Unknown = 1 << 11,
    // #endregion

    // #region Attributes
    /** Flag for objects that have to be "types" for processing purposes but aren't actually types */
    NotAType = 1 << 12,
    /** Type is overloaded (special logic for overloaded functions/generics) */
    Overloaded = 1 << 13,
    /** Indicates that the "normal" flags (0-7) should be treated as inverted */
    Union = 1 << 14,
    // #endregion

    // #region Aggregated
    Primitive = Integer | Float | Char | Bool,
    Structured = Array | Struct | Tuple | Function,
    Normal = Primitive | Structured,
    // #endregion
}

export type Variance = 'covariant' | 'contravariant' | 'invariant';

export interface Type {
    readonly flags: TypeFlags;
    variance: Variance;
    location?: Location;
    signed?: boolean;
    size?: number;
    baseType?: Type;
    fields?: { [key: string]: Type }
    tupleTypes?: Type[];
    paramTypes?: Type[];
    returnType?: Type;
    inference?: Inference;
}

export interface GenericType extends Type {
    typeParams: OrderedMap<ParamType>;
}

export interface ParamType extends Type {
    name: string;
}

export interface Namespace extends Type {
    names: { [name: string]: number[] };
}

export interface Recursive extends Type {
    decl: Declaration;
}

type AllTypeProps = { location?: Location, variance: Variance };
const defaultTypeProps: AllTypeProps = { variance: 'covariant' };

export interface Inference {/* TODO */}

function is(flags: TypeFlags, flag: TypeFlags) {
    return (flags & TypeFlags.Union)
        ? (~flags === flag) // if union, it must match exactly TODO ignore other flags
        : !!(flags & flag); // otherwise, the flag must simply be turned on
} 

export const isInteger = (type: Type) => is(type.flags, TypeFlags.Integer);
export const isFloat = (type: Type) => is(type.flags, TypeFlags.Float);
export const isChar = (type: Type) => is(type.flags, TypeFlags.Char);
export const isBool = (type: Type) => is(type.flags, TypeFlags.Bool);

export const isArray = (type: Type) => is(type.flags, TypeFlags.Array);
export const isStruct = (type: Type) => is(type.flags, TypeFlags.Struct);
export const isTuple = (type: Type) => is(type.flags, TypeFlags.Tuple);
export const isFunction = (type: Type) => is(type.flags, TypeFlags.Function);

export const isAny = (type: Type) => !!(type.flags & TypeFlags.Any);
export const isNever = (type: Type) => !!(type.flags & TypeFlags.Never);
export const isInferred = (type: Type) => !!(type.flags & TypeFlags.Inferred);
export const isUnknown = (type: Type) => !!(type.flags & TypeFlags.Unknown);

export const isOverloaded = (type: Type) => !!(type.flags & TypeFlags.Overloaded);
export const isUnion = (type: Type) => !!(type.flags & TypeFlags.Union);

export const isNotAType = (type: Type) => !!(type.flags & TypeFlags.NotAType);

export const createInteger = (signed: boolean, size: number, props = defaultTypeProps): Type => ({
    flags: TypeFlags.Integer,
    signed,
    size,
    ...props,
});
export const createFloat = (size: number, props = defaultTypeProps): Type => ({
    flags: TypeFlags.Float,
    size,
    ...props,
});
export const createChar = (props = defaultTypeProps): Type => ({ flags: TypeFlags.Char, ...props });
export const createBool = (props = defaultTypeProps): Type => ({ flags: TypeFlags.Bool, ...props });

export const createArray = (baseType: Type, props = defaultTypeProps): Type => ({
    flags: TypeFlags.Array,
    baseType,
    ...props,
});
export const createStruct = (fields: { [key: string]: Type }, props = defaultTypeProps): Type => ({
    flags: TypeFlags.Struct,
    fields,
    ...props,
});
export const createTuple = (tupleTypes: Type[], props = defaultTypeProps): Type => ({
    flags: TypeFlags.Tuple,
    tupleTypes,
    ...props,
});
export const createFunction = (paramTypes: Type[], returnType: Type, props = defaultTypeProps): Type => ({
    flags: TypeFlags.Function,
    paramTypes,
    returnType,
    ...props,
});

export const createAny = (props = defaultTypeProps): Type => ({ flags: TypeFlags.Any, ...props });
export const createNever = (props = defaultTypeProps): Type => ({ flags: TypeFlags.Any, ...props });

export const createGeneric = (typeParams: OrderedMap<ParamType>, type: Type, props = defaultTypeProps): GenericType => ({
    ...type,
    flags: type.flags | TypeFlags.NotAType,
    typeParams,
    ...props,
    variance: type.variance,
});

export const createParam = (name: string, constraint: Type, variance: Variance, props = defaultTypeProps): ParamType => ({
    ...constraint,
    name,
    ...props,
    variance,
});

export const createNamespace = (names: { [name: string]: number[] }, props = defaultTypeProps): Namespace => ({
    flags: TypeFlags.NotAType,
    names,
    ...props,
});

export const createRecursive = (decl: Declaration, props = defaultTypeProps): Recursive => ({
    flags: TypeFlags.NotAType,
    decl,
    ...props,
});

export function checkAssignment(from: Type, to: Type, hasLocation: 'from' | 'to' = 'from'): boolean {
    if (isGeneric(from) || isGeneric(to) || isNamespace(from) || isNamespace(to))
        return //TODO you were here
}
