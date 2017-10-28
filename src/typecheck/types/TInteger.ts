import TType from './TType';
import TNever from './TNever';


/**
 * Integer type, represents a set of integer numbers.
 * Each integer type has a size (in bits) that determines the highest possible value of the type,
 * and a signed flag, indicating whether or not negative values are included.
 */
export default class TInteger extends TType {
    size: number;
    signed: boolean;

    constructor(size: number, signed: boolean) {
        super();
        this.size = size;
        this.signed = signed;
    }

    isAssignableFrom(t: TType) {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        // only integers can be assigned to other integers
        if (!(t instanceof TInteger)) return false;
        // signed ints cannot be assigned to unsigned ints
        if (!this.signed && t.signed) return false;
        // ints of size n can't be assigned to ints of size (<n)
        if (this.size < t.size) return false;
        // unsigned ints cannot be assigned to signed ints of the same size
        if (this.size === t.size && this.signed && !t.signed) return false;
        // we have an integer type which represents either the same or a subset of this's set
        return true;
    }

    specifyTypeParams() {
        return this.clone();
    }

    visitInferTypeArgumentTypes() {}

    isInteger() { return true; }
    isFloat() { return false; }
    isChar() { return false; }
    isBool() { return false; }
    isTuple() { return false; }
    isStruct() { return false; }
    isArray() { return false; }
    isFunction() { return false; }
    isGeneric() { return false; }
    
    hasField() { return false; }

    getBaseType(): never { throw new Error('never'); }
    getFieldType(): never { throw new Error('never'); }
    getParamCount(): never { throw new Error('never'); }
    getTypeParamCount(): never { throw new Error('never'); }
    getParamTypes(): never { throw new Error('never'); }
    getTypeParamTypes(): never { throw new Error('never'); }
    getReturnType(): never { throw new Error('never'); }

    toString() {
        if (this.size === null || this.signed === null) return 'integer';
        let str = this.signed ? 'signed ' : 'unsigned ';
        if (this.size !== Infinity) {
            str += `${this.size}-bit integer`;
        } else {
            str += 'unbounded integer';
        }
        return str;
    }
}