import { Type } from './Type';
import { ILocation } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import TypeCheckError from '../../typecheck/TypeCheckError';
import { TUnknown } from '../../typecheck/types';
import { TYPE_NOT_DEFINED } from '../../typecheck/TypeCheckerMessages';


export class IdentifierType extends Type {
    name: string;

    constructor(name: string, location: ILocation) {
        super();
        this.name = name;
        this.registerLocation('self', location);
    }

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // check for a type param first
        if (context.typeParams[this.name]) {
            return context.typeParams[this.name];
        } else if (!module.types[this.name]) {
            // no type param, no module-scoped type, it's an error
            typeChecker.errors.push(new TypeCheckError(TYPE_NOT_DEFINED(this.name), module.path, this.locations.self));
            return new TUnknown();
        } else {
            return typeChecker.getType(module, this.name);
        }
    }
}