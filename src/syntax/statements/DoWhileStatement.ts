import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import { TYPE_MISMATCH } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import {
    PushLoopFrame,
    TrueBranch,
    PopFrame
} from '../../runtime/instructions';


export class DoWhileStatement extends Statement {
    body: Statement;
    conditionExp: Expression;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // increment the loop number
        context.loopNumber++;
        // type check the body
        const returnType = this.body.getType(typeChecker, module, context);
        context.loopNumber--;
        // type check the condition
        const conditionType = this.conditionExp.getType(typeChecker, module, context);
        if (!conditionType.isBool()) {
            typeChecker.pushError(TYPE_MISMATCH(conditionType, 'bool'), module.path, this.conditionExp.locations.self);
        }
        return returnType;
    }

    translate(translator: Translator, func: Func) {
        const loopFrame = func.pushScope(new PushLoopFrame({ start: func.nextInstrNum() + 1 }));
        // save the branch location
        const startInstructionNumber = func.nextInstrNum();
        // insert the body instructions
        this.body.translate(translator, func);
        // store the condition value into a reference
        const conditionRef = this.conditionExp.translate(translator, func);
        // branch if the condition is true
        func.addInstruction(new TrueBranch(conditionRef, startInstructionNumber));
        loopFrame.end = func.nextInstrNum();
        func.popScope(new PopFrame());
    }
}

export class STDoWhileStatement extends STStatement {
    doToken: Token;
    body: STStatement;
    whileToken: Token;
    openParenToken: Token;
    conditionExp: STExpression;
    closeParenToken: Token;

    reduce() {
        const node = new DoWhileStatement();
        node.body = this.body.reduce();
        node.conditionExp = this.conditionExp.reduce();
        node.createAndRegisterLocation('self', this.doToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}
