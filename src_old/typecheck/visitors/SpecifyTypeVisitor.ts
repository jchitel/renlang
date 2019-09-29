import {
    TType, TGeneric, TParam, TArg, TOverloadedGeneric
} from '~/typecheck/types';
import { SymbolTable } from '~/typecheck/TypeCheckContext';
import CloneVisitor from '~/typecheck/visitors/CloneVisitor';


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
export default class SpecifyTypeVisitor extends CloneVisitor {
    args: SymbolTable<TType>;

    constructor(args: SymbolTable<TType>) {
        super();
        this.args = args;
    }

    visitGeneric(_type: TGeneric): TType {
        // this should never be called on a generic type
        throw new Error("Method not implemented.");
    }

    visitOverloadedGeneric(type: TOverloadedGeneric): TType {
        // TODO this should operate on the non-generic type, but this is getting obnoxious
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
}
