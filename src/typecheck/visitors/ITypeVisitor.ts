import {
    TInteger, TFloat, TChar, TBool, TArray, TStruct, TTuple, TFunction,
    TGeneric, TParam, TArg, TUnion, TAny, TNever, TRecursive, TInferred,
} from '~/typecheck/types';


export default interface ITypeVisitor<T> {
    // primitive types
    visitInteger(type: TInteger): T;
    visitFloat(type: TFloat): T;
    visitChar(type: TChar): T;
    visitBool(type: TBool): T;

    // structured types
    visitArray(type: TArray): T;
    visitStruct(type: TStruct): T;
    visitTuple(type: TTuple): T;

    // complex types
    visitFunction(type: TFunction): T;
    visitGeneric(type: TGeneric): T;
    visitParam(type: TParam): T;
    visitArg(type: TArg): T;
    visitUnion(type: TUnion): T;

    // special types
    visitAny(type: TAny): T;
    visitNever(type: TNever): T;

    // hidden types
    visitRecursive(type: TRecursive): T;
    visitInferred(type: TInferred): T;
}
