import { Expression } from './Expression';
import { ILocation } from '../../parser/Tokenizer';
import { TType, TUnknown } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import TypeCheckError from '../../typecheck/TypeCheckError';
import Module from '../../runtime/Module';
import { VALUE_NOT_DEFINED } from '../../typecheck/TypeCheckerMessages';


export class IdentifierExpression extends Expression {
    name: string;

    constructor(name: string, location: ILocation) {
        super();
        this.name = name;
        this.registerLocation('self', location);
    }

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        let actualType: TType = context.symbolTable[this.name];
        if (!actualType) {
            actualType = typeChecker.getValueType(module, this.name) as TType;
        }
        if (!actualType) {
            typeChecker.errors.push(new TypeCheckError(VALUE_NOT_DEFINED(this.name), module.path, this.locations.self));
            return new TUnknown();
        }
        return actualType;
    }

    translate(translator: Translator, func: Func) {
        // check to see if the name matches a variable in the current scope
        if (func.getFromScope(this.name) !== undefined) return func.getFromScope(this.name);
        // otherwise we need the translator to resolve a module-scope reference
        return func.addRefInstruction(translator, ref => translator.referenceIdentifier(ref, this.name, func.moduleId));
    }
}
