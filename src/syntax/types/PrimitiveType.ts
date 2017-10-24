import { Type } from './Type';
import { ILocation } from '../../parser/Tokenizer';
import { TInteger, TFloat, TChar, TArray, TBool, TTuple, TAny } from '../../typecheck/types';


export class PrimitiveType extends Type {
    typeNode: string;

    constructor(typeNode: string, location: ILocation) {
        super();
        this.typeNode = typeNode;
        this.registerLocation('self', location);
    }

    resolveType() {
        switch (this.typeNode) {
            case 'u8': case 'byte': return new TInteger(8, false);
            case 'i8': return new TInteger(8, true);
            case 'u16': case 'short': return new TInteger(16, false);
            case 'i16': return new TInteger(16, true);
            case 'u32': return new TInteger(32, false);
            case 'i32': case 'integer': return new TInteger(32, true);
            case 'u64': return new TInteger(64, false);
            case 'i64': case 'long': return new TInteger(64, true);
            case 'int': return new TInteger(Infinity, true);
            case 'f32': case 'float': return new TFloat(32);
            case 'f64': case 'double': return new TFloat(64);
            case 'char': return new TChar();
            case 'string': return new TArray(new TChar());
            case 'bool': return new TBool();
            case 'void': return new TTuple([]);
            case 'any': return new TAny();
            default: throw new Error(`Invalid built-in type ${this.typeNode}`);
        }
    }
}