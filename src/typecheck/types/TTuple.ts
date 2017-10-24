import TType from './TType';
import TNever from './TNever';
import { SymbolTable } from '../TypeCheckContext';


/**
 * Tuple type, represents a group of values of several heterogeneous types, including no values at all.
 * TODO: handle type parameters
 */
export default class TTuple extends TType {
    types: TType[];

    constructor(types: TType[]) {
        super();
        this.types = types;
    }

    isAssignableFrom(t: TType) {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        // only tuples can be assigned to other tuples
        if (!(t instanceof TTuple)) return false;
        // need to have the same number of values
        if (this.types.length !== t.types.length) return false;
        // test assignability of component types
        for (let i = 0; i < this.types.length; ++i) {
            if (!this.types[i].isAssignableFrom(t.types[i])) return false;
        }
        return true;
    }

    specifyTypeParams(args: SymbolTable<TType>) {
        const specific = this.clone();
        specific.types = specific.types.map(t => t.specifyTypeParams(args));
        return specific;
    }
    
    isInteger() { return false; }
    isFloat() { return false; }
    isChar() { return false; }
    isBool() { return false; }
    isTuple() { return true; }
    isStruct() { return false; }
    isArray() { return false; }
    isFunction() { return false; }
    
    hasField() { return false; }

    getBaseType(): never { throw new Error('never'); }
    getFieldType(): never { throw new Error('never'); }
    getParamCount(): never { throw new Error('never'); }
    getParamTypes(): never { throw new Error('never'); }
    getReturnType(): never { throw new Error('never'); }

    toString() {
        return `(${this.types.map(t => t.toString()).join(', ')})`;
    }
}