import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TTuple } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { SetTupleRef, Return } from '../../runtime/instructions';


export class ReturnStatement extends Statement {
    exp: Expression;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // no return value, assumed to be ()
        if (!this.exp) return new TTuple([]);
        // otherwise check the return value
        return this.exp.getType(typeChecker, module, context);
    }

    translate(translator: Translator, func: Func) {
        // save expression to ref
        let returnRef;
        if (this.exp) {
            returnRef = this.exp.translate(translator, func);
        } else {
            returnRef = func.addRefInstruction(translator, ref => new SetTupleRef(ref, []));
        }
        // add return expression
        func.addInstruction(new Return(returnRef));
    }
}

export class STReturnStatement extends STStatement {
    returnToken: Token;
    exp?: STExpression;

    reduce() {
        const node = new ReturnStatement();
        if (this.exp) {
            node.exp = this.exp.reduce();
            node.createAndRegisterLocation('self', this.returnToken.getLocation(), node.exp.locations.self);
        } else {
            node.registerLocation('self', this.returnToken.getLocation());
        }
        return node;
    }
}
