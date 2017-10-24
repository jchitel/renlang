import { Expression } from './Expression';
import { ILocation } from '../../parser/Tokenizer';
import { TChar } from '../../typecheck/types';
import { SetCharRef } from '../../runtime/instructions';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';


export class CharLiteral extends Expression {
    value: string;

    constructor(value: string, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }

    resolveType() {
        return new TChar();
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, (ref: number) => new SetCharRef(ref, this.value));
    }
}
