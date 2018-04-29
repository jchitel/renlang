import ITypeVisitor from './ITypeVisitor';
import {
    TType, TInteger, TFloat, TChar, TBool, TArray, TStruct, TTuple, TFunction,
    TGeneric, TParam, TArg, TUnion, TAny, TNever, TRecursive, TInferred, TOverloadedGeneric
} from '~/typecheck/types';
import { SymbolTable } from '~/typecheck/TypeCheckContext';


export default class InferTypeArgsVisitor implements ITypeVisitor<void> {
    argMap: SymbolTable<TType>;
    argType: TType;

    constructor(argMap: SymbolTable<TType>, argType: TType) {
        this.argMap = argMap;
        this.argType = argType;
    }

    branch(newArgType: TType) {
        return new InferTypeArgsVisitor(this.argMap, newArgType);
    }

    visitInteger(_type: TInteger): void {}
    visitFloat(_type: TFloat): void {}
    visitChar(_type: TChar): void {}
    visitBool(_type: TBool): void {}

    visitArray(type: TArray): void {
        type.visit(this.branch(this.argType.getBaseType()));
    }

    visitStruct(type: TStruct): void {
        for (const key of Object.keys(type.fields)) {
            type.fields[key].visit(this.branch(this.argType.getField(key)));
        }
    }

    visitTuple(type: TTuple): void {
        const argTypes = this.argType.getTupleTypes();
        for (let i = 0; i < type.types.length; ++i) {
            type.types[i].visit(this.branch(argTypes[i]));
        }
    }

    visitFunction(type: TFunction): void {
        const argParams = this.argType.getParams();
        for (let i = 0; i < type.paramTypes.length; ++i) {
            type.paramTypes[i].visit(this.branch(argParams[i]));
        }
        type.returnType.visit(this.branch(this.argType.getReturnType()));
    }

    visitGeneric(_type: TGeneric): void {
        // this should never be called on generic
        throw new Error("Method not implemented.");
    }

    visitOverloadedGeneric(type: TOverloadedGeneric): void {
        // if this is being called, it is being called on the param-less type
        const paramLess = type.getParamLessType();
        if (paramLess) return paramLess.visit(this);
        throw new Error('This should never be called on an overloaded generic with no parameter-less type');
    }
    
    visitNamespace(): void {
        // this should never be called on a namespace
        throw new Error("Method not implemented.");
    }

    /**
     * This is the leaf visitor method for this process.
     * What we want to do is determine if there is an assignability
     * relationship between the existing assigned type and the type we've arrived at here.
     * If there isn't one, we just keep the existing one, the next type checking step
     * will catch it.
     */
    visitParam(type: TParam): void {
        const currentAssignedType = this.argMap[type.name];
        if (this.argType.isAssignableFrom(currentAssignedType)) {
            // use the more general one
            this.argMap[type.name] = this.argType;
        }
        // if we have arrived here, either the more general one is already assigned,
        // or there is no assignability relationship, so we are keeping the existing one.
    }

    visitArg(type: TArg): void {
        type.type.visit(this);
    }

    visitUnion(type: TUnion): void {
        // TODO: this is definitely insufficient
        for (const t of type.types) {
            t.visit(this);
        }
    }

    visitAny(_type: TAny): void {}
    visitNever(_type: TNever): void {}

    visitRecursive(type: TRecursive): void {
        type.decl.type.visit(this);
    }

    visitInferred(_type: TInferred): void {}
}
