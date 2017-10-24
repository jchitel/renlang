import { Expression } from './Expression';
import { ILocation } from '../../parser/Tokenizer';
import { TInteger } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { SetIntegerRef } from '../../runtime/instructions';


export class IntegerLiteral extends Expression {
    value: number;

    constructor(value: number, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }

    resolveType() {
        let signed, size;
        if (this.value < 0) {
            signed = true;
            if ((-this.value) < (2 ** 7)) size = 8;
            else if ((-this.value) < (2 ** 15)) size = 16;
            else if ((-this.value) < (2 ** 31)) size = 32;
            else if (this.value > -(2 ** 63)) size = 64; // TODO: not sure this is possible to calculate this way
            else size = Infinity;
        } else {
            signed = false;
            if (this.value < (2 ** 8)) size = 8;
            else if (this.value < (2 ** 16)) size = 16;
            else if (this.value < (2 ** 32)) size = 32;
            else if (this.value < (2 ** 64)) size = 64; // TODO: not sure this is possible to calculate this way
            else size = Infinity;
        }
        return new TInteger(size, signed);
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, ref => new SetIntegerRef(ref, this.value));
    }
}
