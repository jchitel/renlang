import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


type StructFieldTypes = { [name: string]: TType };

/**
 * Struct type, extension of tuple type where the values have names (fields).
 */
export default class TStruct extends TType {
    constructor(public location?: Location, public fields: StructFieldTypes = {}) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitStruct(this, param);
    }

    toString() {
        return `{ ${Object.entries(this.fields).map(([k, v]) => `'${v}' ${k}`).join('; ')} }`;
    }
}