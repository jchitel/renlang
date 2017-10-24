import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import TypeCheckError from '../../typecheck/TypeCheckError';
import { TYPE_MISMATCH } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import {
    PushLoopFrame,
    FalseBranch,
    Jump,
    PopFrame
} from '../../runtime/instructions';


export class WhileStatement extends Statement {
    conditionExp: Expression;
    body: Statement;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // type check the condition
        const conditionType = this.conditionExp.getType(typeChecker, module, context);
        if (!conditionType.isBool()) {
            typeChecker.errors.push(new TypeCheckError(TYPE_MISMATCH(conditionType, 'bool'), module.path, this.conditionExp.locations.self));
        }
        // increment the loop number
        context.loopNumber++;
        // type check the body
        const returnType = this.body.getType(typeChecker, module, context);
        context.loopNumber--;
        return returnType;
    }

    translate(translator: Translator, func: Func) {
        const loopFrame = func.pushScope(new PushLoopFrame({ start: func.nextInstrNum() + 1 }));
        // store the condition value into a reference
        const conditionInstructionNumber = func.nextInstrNum();
        const conditionRef = this.conditionExp.translate(translator, func);
        // branch if the condition is false
        const branch = func.addInstruction(new FalseBranch({ ref: conditionRef }));
        // insert the body instructions
        this.body.translate(translator, func);
        // jump to the check instruction
        func.addInstruction(new Jump({ target: conditionInstructionNumber }));
        // add a false branch target noop
        branch.target = func.nextInstrNum();
        loopFrame.end = branch.target;
        func.popScope(new PopFrame());
    }
}

export class STWhileStatement extends STStatement {
    whileToken: Token;
    openParenToken: Token;
    conditionExp: STExpression;
    closeParenToken: Token;
    body: STStatement;

    reduce() {
        const node = new WhileStatement();
        node.conditionExp = this.conditionExp.reduce();
        node.body = this.body.reduce();
        node.createAndRegisterLocation('self', this.whileToken.getLocation(), node.body.locations.self);
        return node;
    }
}
