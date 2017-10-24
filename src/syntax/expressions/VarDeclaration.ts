import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import TypeCheckError from '../../typecheck/TypeCheckError';
import { NAME_CLASH } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import { AddToScope } from '../../runtime/instructions';


export class VarDeclaration extends Expression {
    name: string;
    initExp: Expression;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const expType = this.initExp.getType(typeChecker, module, context);
        if (context.symbolTable[this.name] || typeChecker.getValueType(module, this.name)) {
            // symbol already exists
            typeChecker.errors.push(new TypeCheckError(NAME_CLASH(this.name), module.path, this.locations.name));
        } else {
            // add the variable to the symbol table
            context.symbolTable[this.name] = expType;
        }
        return expType;
    }

    translate(translator: Translator, func: Func) {
        const initRef = this.initExp.translate(translator, func);
        func.addToScope(this.name, initRef, new AddToScope(this.name, initRef));
        return initRef;
    }
}

export class STVarDeclaration extends STExpression {
    varIdentToken: Token;
    equalsToken: Token;
    initialValue: STExpression;

    reduce() {
        const node = new VarDeclaration();
        node.name = this.varIdentToken.image;
        node.registerLocation('name', this.varIdentToken.getLocation());
        node.initExp = this.initialValue.reduce();
        node.createAndRegisterLocation('self', node.locations.name, node.initExp.locations.self);
        return node;
    }
}
