import { Statement } from './Statement';
import { ILocation } from '../../parser/Tokenizer';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { Noop as INoop } from '../../runtime/instructions';
import { TNever } from '../../typecheck/types';


/**
 * Represents a statement that does nothing, representable in code by {}.
 * Inside another block, this is effectively nothing, but this has semantic meaning as a function body or statement body.
 */
export class Noop extends Statement {
    constructor(startLoc: ILocation, endLoc: ILocation) {
        super();
        this.createAndRegisterLocation('self', startLoc, endLoc);
    }

    // noop, nothing to check
    resolveType() {
        return new TNever();
    }

    translate(_translator: Translator, func: Func) {
        func.addInstruction(new INoop());
    }
}
