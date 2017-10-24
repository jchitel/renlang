import { Expression } from './Expression';
import { ILocation } from '../../parser/Tokenizer';
import { TBool } from '../../typecheck/types';
import { SetBoolRef } from '../../runtime/instructions';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';


export class BoolLiteral extends Expression {
    value: boolean;

    constructor(image: string, location: ILocation) {
        super();
        this.value = image === 'true';
        this.registerLocation('self', location);
    }

    resolveType() {
        return new TBool();
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, (ref: number) => new SetBoolRef(ref, this.value));
    }
}
