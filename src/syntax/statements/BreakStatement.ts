import { Statement, STStatement } from './Statement';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import { INVALID_BREAK_STATEMENT, INVALID_LOOP_NUM } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import { TNever } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { Break } from '../../runtime/instructions';


export class BreakStatement extends Statement {
    loopNumber: number;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        if (context.loopNumber < 0) {
            typeChecker.pushError(INVALID_BREAK_STATEMENT, module.path, this.locations.self);
        } else if (this.loopNumber < 0 || this.loopNumber > context.loopNumber) {
            typeChecker.pushError(INVALID_LOOP_NUM(this.loopNumber, context.loopNumber), module.path, this.locations.self);
        }
        return new TNever();
    }

    translate(_translator: Translator, func: Func) {
        func.addInstruction(new Break(this.loopNumber));
    }
}

export class STBreakStatement extends STStatement {
    breakToken: Token;
    loopNumber?: Token;

    reduce() {
        const node = new BreakStatement();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.breakToken.getLocation(), this.loopNumber.getLocation());
        } else {
            node.loopNumber = 0;
            node.registerLocation('self', this.breakToken.getLocation());
        }
        return node;
    }
}
