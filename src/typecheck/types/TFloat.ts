import TType from './TType';
import TNever from './TNever';


/**
 * Floating point type, represents a set of potentially fractional numbers.
 * Each floating point type has a size (in bits) that determines the precision of the type.
 * The data of floating point numbers consists of the bits of precision (called the mantissa),
 * the bits of an exponent (the distance from the MSB of the mantissa and the ones place),
 * and the sign of the number.
 */
export default class TFloat extends TType {
    size: number;

    constructor(size: number) {
        super();
        this.size = size;
    }

    isAssignableFrom(t: TType) {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        // only floats can be assigned to other floats
        if (!(t instanceof TFloat)) return false;
        // floats of size n can't be assigned to floats of size <n
        if (this.size < t.size) return false;
        // we have a float type which represents either the same or a subset of this's set
        return true;
    }

    specifyTypeParams() {
        return this.clone();
    }

    isInteger() { return false; }
    isFloat() { return true; }
    isChar() { return false; }
    isBool() { return false; }
    isTuple() { return false; }
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
        return `${this.size}-bit float`;
    }
}