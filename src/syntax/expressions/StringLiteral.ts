import { Expression } from './Expression';
import { ILocation } from '../../parser/Tokenizer';
import { TChar, TArray } from '../../typecheck/types';
import { SetStringRef } from '../../runtime/instructions';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';


export class StringLiteral extends Expression {
    value: string;

    constructor(value: string, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }

    resolveType() {
        return new TArray(new TChar());
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, (ref: number) => new SetStringRef(ref, this.value));
    }
}
