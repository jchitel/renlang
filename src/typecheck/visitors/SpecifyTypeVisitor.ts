import ITypeVisitor from './ITypeVisitor';
import {
    TType, TInteger, TFloat, TChar, TBool, TArray, TStruct, TTuple, TFunction,
    TGeneric, TParam, TArg, TUnion, TAny, TNever, TRecursive, TInferred
} from '~/typecheck/types';
import { SymbolTable } from '~/typecheck/TypeCheckContext';


/**
 * This visitor specifies generic types, which must happen
 * every time a generic type is used in order to resolve the
 * usage to a specific type.
 *
 * The main goal of this process is to replace usages of type
 * parameters in a generic type with the provided type arguments
 * corresponding to those type parameters.
 * See "visitParam()" for that logic.
 * All other logic is simply to clone the current type and visit
 * all component types within those types, if any exist.
 */
export default class SpecifyTypeVisitor implements ITypeVisitor<TType> {
    args: SymbolTable<TType>;

    constructor(args: SymbolTable<TType>) {
        this.args = args;
    }

    // primitive types have no component types, so we leave them alone
    visitInteger(type: TInteger): TType { return type.clone(); }
    visitFloat(type: TFloat): TType { return type.clone(); }
    visitChar(type: TChar): TType { return type.clone(); }
    visitBool(type: TBool): TType { return type.clone(); }

    visitArray(type: TArray): TType {
        const specific = type.clone();
        specific.baseType = specific.baseType.visit(this);
        return specific;
    }

    visitStruct(type: TStruct): TType {
        const specific = type.clone();
        specific.fields = {};
        for (const k of Object.keys(type.fields)) {
            specific.fields[k] = type.fields[k].visit(this);
        }
        return specific;
    }

    visitTuple(type: TTuple): TType {
        const specific = type.clone();
        specific.types = specific.types.map(t => t.visit(this));
        return specific;
    }

    visitFunction(type: TFunction): TType {
        const specific = type.clone();
        specific.paramTypes = specific.paramTypes.map(t => t.visit(this));
        specific.returnType = specific.returnType.visit(this);
        return specific;
    }

    visitGeneric(_type: TGeneric): TType {
        // this should never be called on a generic type
        throw new Error("Method not implemented.");
    }

    /**
     * This is the "leaf" operation of this visitor.
     * Once we reach a type parameter, we can use the provided args table
     * to get the corresponding type provided for the parameter.
     */
    visitParam(type: TParam): TType {
        return this.args[type.name];
    }

    // already been specified, just return it
    visitArg(type: TArg): TType { return type.clone(); }

    visitUnion(type: TUnion): TType {
        const specific = type.clone();
        specific.types = specific.types.map(t => t.visit(this));
        return specific;
    }

    visitAny(type: TAny): TType { return type.clone(); }
    visitNever(type: TNever): TType { return type.clone(); }
    visitRecursive(type: TRecursive): TType { return type.clone(); }
    visitInferred(type: TInferred): TType { return type.clone(); }
}
