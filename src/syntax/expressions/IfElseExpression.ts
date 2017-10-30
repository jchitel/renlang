import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import { determineGeneralType } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import { TYPE_MISMATCH } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import { FalseBranch, CopyRef, Jump, Noop } from '../../runtime/instructions';


export class IfElseExpression extends Expression {
    condition: Expression;
    consequent: Expression;
    alternate: Expression;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const conditionType = this.condition.getType(typeChecker, module, context);
        if (!conditionType.isBool()) typeChecker.pushError(TYPE_MISMATCH(conditionType, 'bool'), module.path, this.condition.locations.self);
        const type = this.consequent.getType(typeChecker, module, context);
        const altType = this.alternate.getType(typeChecker, module, context);
        return determineGeneralType(type, altType);
    }

    translate(translator: Translator, func: Func) {
        // get new reference id for result of expression
        const ref = translator.newReference();
        // if condition
        const conditionRef = this.condition.translate(translator, func);
        const branch = func.addInstruction(new FalseBranch({ ref: conditionRef }));
        // evaluate consequent, copy into result, jump
        const csqRef = this.consequent.translate(translator, func);
        func.addInstruction(new CopyRef(csqRef, ref));
        const jump = func.addInstruction(new Jump());
        // evaluate alternate, copy into result
        branch.target = func.nextInstrNum();
        const altRef = this.alternate.translate(translator, func);
        func.addInstruction(new CopyRef(altRef, ref));
        jump.target = func.nextInstrNum();
        func.addInstruction(new Noop());
        // return result reference
        return ref;
    }
}

export class STIfElseExpression extends STExpression {
    ifToken: Token;
    openParenToken: Token;
    condition: STExpression;
    closeParenToken: Token;
    consequent: STExpression;
    elseToken: Token;
    alternate: STExpression;

    reduce() {
        const node = new IfElseExpression();
        node.condition = this.condition.reduce();
        node.consequent = this.consequent.reduce();
        node.alternate = this.alternate.reduce();
        node.createAndRegisterLocation('self', this.ifToken.getLocation(), node.alternate.locations.self);
        return node;
    }
}
