import { Expression } from './Expression';
import { ILocation } from '../../parser/Tokenizer';
import { TFloat } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { SetFloatRef } from '../../runtime/instructions';


export class FloatLiteral extends Expression {
    value: number;

    constructor(value: number, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }

    resolveType() {
        return new TFloat(64); // TODO: add this logic
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, ref => new SetFloatRef(ref, this.value));
    }
}
