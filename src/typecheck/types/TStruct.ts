import TType from './TType';
import TNever from './TNever';
import { SymbolTable } from '../TypeCheckContext';


type StructFieldTypes = { [name: string]: TType };

/**
 * Struct type, extension of tuple type where the values have names (fields).
 * TODO: handle type parameters
 */
export default class TStruct extends TType {
    fields: StructFieldTypes;

    constructor(fields: StructFieldTypes) {
        super();
        this.fields = fields;
    }

    isAssignableFrom(t: TType) {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        // only structs can be assigned to other structs
        if (!(t instanceof TStruct)) return false;
        // a type is assignable to this if it has the fields in this and those types are assignable
        // NOTE: this does not mean that t can't have more fields
        for (const k of Object.keys(this.fields)) {
            if (!t.fields[k]) return false;
            if (!this.fields[k].isAssignableFrom(t.fields[k])) return false;
        }
        return true;
    }

    specifyTypeParams(args: SymbolTable<TType>) {
        const specific = this.clone();
        specific.fields = {};
        for (const k of Object.keys(this.fields)) {
            specific.fields[k] = this.fields[k].specifyTypeParams(args);
        }
        return specific;
    }
    
    isInteger() { return false; }
    isFloat() { return false; }
    isChar() { return false; }
    isBool() { return false; }
    isTuple() { return false; }
    isStruct() { return true; }
    isArray() { return false; }
    isFunction() { return false; }
    
    hasField(field: string) {
        return !!this.fields[field];
    }

    getBaseType(): never { throw new Error('never'); }

    getFieldType(field: string) {
       return this.fields[field];
    }
    
    getParamCount(): never { throw new Error('never'); }
    getParamTypes(): never { throw new Error('never'); }
    getReturnType(): never { throw new Error('never'); }

    toString() {
        return `{ ${Object.entries(this.fields).map(([k, v]) => `'${v}' ${k}`).join('; ')} }`;
    }
}