import { CSTNode } from '../Node';
import { STType, Type } from './Type';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import TypeCheckError from '../../typecheck/TypeCheckError';
import { TYPE_NOT_DEFINED } from '../../typecheck/TypeCheckerMessages';
import { TGeneric, TUnknown } from '../../typecheck/types';
import Module from '../../runtime/Module';


export class SpecificType extends Type {
    name: string;
    typeArgs: Type[];

    /**
     * So, this "specific type" is an "instantiation" of some generic type.
     * So what type does this resolve to?
     * Well, a generic type is a combination of the type parameters and the type definition, which uses the type parameters.
     * When it is made specific, there are no longer any type parameters; they are "filled in".
     * So all that we are left with will be the type definition, with type parameter usages "filled in".
     * What does this mean for us?
     * Well, here we have the name of the generic type, and the type arguments, which we will use to "fill in" the type.
     * So we need to do what an IdentifierType does and look up the type name, which will resolve to a TGeneric.
     * We then iterate over the type arguments (resolving their types first), link them with the type parameters of the TGeneric,
     * then take the type definition of the TGeneric and visit it with the type arguments, filling in the type parameters.
     * The result will be a TSpecific copy of the TGeneric with all type parameters filled in.
     * To do the "filling in" we will need yet another visitor method for each type node class, call it specifyTypeParams.
     */
    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // first, resolve the TGeneric associated with the name TODO: this logic is duplicated from IdentifierType
        let genericType: TGeneric;
        if (context.typeParams[this.name]) {
            genericType = context.typeParams[this.name].constraint as TGeneric; // TODO no?
        } else if (!module.types[this.name]) {
            // no type param, no module-scoped type, it's an error
            typeChecker.errors.push(new TypeCheckError(TYPE_NOT_DEFINED(this.name), module.path, this.locations.self));
            return new TUnknown();
        } else {
            genericType = typeChecker.getType(module, this.name) as TGeneric;
        }
        // second, resolve all type arguments
        const typeArgs = this.typeArgs.map(a => a.getType(typeChecker, module, context));
        // third, specify the generic type
        return genericType.specifyGenericType(typeArgs);
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
