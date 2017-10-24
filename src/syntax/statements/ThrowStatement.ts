import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TNever } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { Throw } from '../../runtime/instructions';


export class ThrowStatement extends Statement {
    exp: Expression;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // type check the expression, it can be anything so we don't have to do anything with the result
        this.exp.getType(typeChecker, module, context);
        return new TNever();
    }

    translate(translator: Translator, func: Func) {
        // save expression to ref
        const throwRef = this.exp.translate(translator, func);
        // add throw instruction
        func.addInstruction(new Throw(throwRef));
    }
}

export class STThrowStatement extends STStatement {
    throwToken: Token;
    exp: STExpression;

    reduce() {
        const node = new ThrowStatement();
        node.exp = this.exp.reduce();
        node.createAndRegisterLocation('self', this.throwToken.getLocation(), node.exp.locations.self);
        return node;
    }
}
