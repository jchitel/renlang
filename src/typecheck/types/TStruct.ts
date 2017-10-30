import TType from './TType';
import ITypeVisitor from '../visitors';


type StructFieldTypes = { [name: string]: TType };

/**
 * Struct type, extension of tuple type where the values have names (fields).
 */
export default class TStruct extends TType {
    fields: StructFieldTypes;

    constructor(fields: StructFieldTypes) {
        super();
        this.fields = fields;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitStruct(this);
    }

    toString() {
        return `{ ${Object.entries(this.fields).map(([k, v]) => `'${v}' ${k}`).join('; ')} }`;
    }
}