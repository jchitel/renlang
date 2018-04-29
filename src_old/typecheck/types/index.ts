export { default as TAny } from './TAny';
export { default as TArray } from './TArray';
export { default as TBool } from './TBool';
export { default as TChar } from './TChar';
export { default as TFloat } from './TFloat';
export { default as TFunction } from './TFunction';
export { default as TGeneric, TOverloadedGeneric } from './TGeneric';
export { default as TInteger } from './TInteger';
export { default as TNever } from './TNever';
export { default as TParam, TParams, TArg, TArgs } from './TParam';
export { default as TRecursive } from './TRecursive';
export { default as TStruct } from './TStruct';
export { default as TTuple } from './TTuple';
export { default as TType } from './TType';
export { default as TUnion } from './TUnion';
export { default as TUnknown } from './TUnknown';
export { default as TInferred } from './TInferred';
export { default as TNamespace } from './TNamespace';

import TType from './TType';
import TAny from './TAny';

/**
 * Given two optional types, return the more general one of the two
 */
export function determineGeneralType(type1: TType, type2: TType) {
    // there is a relationship, select the more general one
    if (type2.isAssignableFrom(type1) && !type1.isAssignableFrom(type2)) return type2;
    if (!type2.isAssignableFrom(type1) && type1.isAssignableFrom(type2)) return type1;
    // no relationship, the only type is any
    if (!type2.isAssignableFrom(type1) && !type1.isAssignableFrom(type2)) return new TAny();
    // types are equivalent
    return type1;
}
