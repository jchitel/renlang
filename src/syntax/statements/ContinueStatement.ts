import { Statement, STStatement } from './Statement';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import { INVALID_CONTINUE_STATEMENT, INVALID_LOOP_NUM } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import { TNever } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { Continue } from '../../runtime/instructions';


export class ContinueStatement extends Statement {
    loopNumber: number;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        if (context.loopNumber < 0) {
            typeChecker.pushError(INVALID_CONTINUE_STATEMENT, module.path, this.locations.self);
        } else if (this.loopNumber < 0 || this.loopNumber > context.loopNumber) {
            typeChecker.pushError(INVALID_LOOP_NUM(this.loopNumber, context.loopNumber), module.path, this.locations.self);
        }
        return new TNever();
    }

    translate(_translator: Translator, func: Func) {
        func.addInstruction(new Continue(this.loopNumber));
    }
}

export class STContinueStatement extends STStatement {
    continueToken: Token;
    loopNumber?: Token;

    reduce() {
        const node = new ContinueStatement();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.continueToken.getLocation(), this.loopNumber.getLocation());
        } else {
            node.loopNumber = 0;
            node.registerLocation('self', this.continueToken.getLocation());
        }
        return node;
    }
}