import {
    TInteger, TFloat, TChar, TBool, TArray, TStruct, TTuple, TFunction,
    TGeneric, TParam, TArg, TUnion, TAny, TNever, TRecursive, TInferred,
    TNamespace, TOverloadedGeneric, TParams, TArgs
} from '~/typecheck/types';


export default interface ITypeVisitor<T, P = undefined> {
    // primitive types
    visitInteger(type: TInteger, param?: P): T;
    visitFloat(type: TFloat, param?: P): T;
    visitChar(type: TChar, param?: P): T;
    visitBool(type: TBool, param?: P): T;

    // structured types
    visitArray(type: TArray, param?: P): T;
    visitStruct(type: TStruct, param?: P): T;
    visitTuple(type: TTuple, param?: P): T;

    // complex types
    visitFunction(type: TFunction, param?: P): T;
    visitGeneric(type: TGeneric, param?: P): T;
    visitParam(type: TParam, param?: P): T;
    visitParams(type: TParams, param?: P): T;
    visitArg(type: TArg, param?: P): T;
    visitArgs(type: TArgs, param?: P): T;
    visitUnion(type: TUnion, param?: P): T;

    // special types
    visitAny(type: TAny, param?: P): T;
    visitNever(type: TNever, param?: P): T;

    // hidden types
    visitRecursive(type: TRecursive, param?: P): T;
    visitInferred(type: TInferred, param?: P): T;
    visitNamespace(type: TNamespace, param?: P): T;
    visitOverloadedGeneric(type: TOverloadedGeneric, param?: P): T;
}
