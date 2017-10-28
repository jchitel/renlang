import { CSTNode } from '../Node';
import { STType, Type } from './Type';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import { TYPE_NOT_DEFINED, NOT_GENERIC, INVALID_TYPE_ARG_COUNT, INVALID_TYPE_ARG} from '../../typecheck/TypeCheckerMessages';
import { TType, TGeneric } from '../../typecheck/types';
import Module from '../../runtime/Module';


export class SpecificType extends Type {
    name: string;
    typeArgs: Type[];

    /**
     * So, this "specific type" is an "instantiation" of some generic type.
     * So what type does this resolve to?
     * Well, a generic type is a combination of the type parameters and the type definition, which uses the type parameters.
     * When it is made specific, there are no longer any type parameters; they are "filled in".
     * However, this DOES NOT mean that the concept of the generic type simply goes away.
     * Type constaints on the parameters dictate what types can be provided for the parameters,
     * but variance constraints dictate the assignability rules AFTER the type parameters have been assigned.
     * This information must stay with the type.
     * So we have the following result:
     * 
     * TGeneric w/ TParams
     * ||
     * \/
     * Normal TType w/ TArgs
     * 
     * The generic type is the container for the parameter types and the type definition.
     * The parameter type is the container for the constraints, if any.
     * An argument type is a container for the provided type and the variance constraints.
     * 
     * When a generic type is "filled in", the provided type arguments are used to create "argument types",
     * which replace all instances of the type parameters in the type definition, as well as the defined
     * type params themselves.
     * The generic type then returns the "specific type", which is simply a normal type with the type parameters
     * replaced with type arguments.
     * 
     * This means any type can be validly assigned to a specific type, as long as the corresponding types are assignable to
     * the type arguments based on the variance rules.
     */
    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // first, resolve the TGeneric associated with the name
        let genericType: TType;
        if (!module.types[this.name]) {
            // no module-scoped type, it's an error
            return typeChecker.pushError(TYPE_NOT_DEFINED(this.name), module.path, this.locations.self);
        } else {
            genericType = typeChecker.getType(module, this.name);
            // not a generic type
            if (!genericType.isGeneric()) return typeChecker.pushError(NOT_GENERIC(this.name), module.path, this.locations.self);
        }
        // second, resolve all type arguments
        const typeArgs = this.typeArgs.map(a => a.getType(typeChecker, module, context));
        // third, make sure the number of type arguments is correct
        const numParams = genericType.getTypeParamCount();
        if (typeArgs.length !== numParams) return typeChecker.pushError(INVALID_TYPE_ARG_COUNT(numParams, typeArgs.length), module.path, this.locations.self);
        // fourth, make sure each type argument is assignable to the corresponding type parameter
        const paramTypes = genericType.getTypeParamTypes();
        for (let i = 0; i < typeArgs.length; ++i) {
            const [param, arg] = [paramTypes.getValue(i), typeArgs[i]];
            if (param.isAssignableFrom(arg)) return typeChecker.pushError(INVALID_TYPE_ARG(arg, param.name, param.constraint), module.path, this.typeArgs[i].locations.self);
        }
        // fifth, specify the generic type
        return (genericType as TGeneric).specifyGenericType(typeArgs);
    }
}

export class STSpecificType extends STType {
    nameToken: Token;
    typeArgList: STTypeArgList;

    reduce() {
        const node = new SpecificType();
        node.name = this.nameToken.image;
        node.registerLocation('name', this.nameToken.getLocation());
        node.typeArgs = this.typeArgList.reduce();
        node.createAndRegisterLocation('self', node.locations.name, this.typeArgList.closeGtToken.getLocation());
        return node;
    }
}

export class STTypeArgList extends CSTNode<Type[]> {
    openLtToken: Token;
    closeGtToken: Token;
    types: STType[];

    reduce() {
        return this.types.map(t => t.reduce());
    }
}
