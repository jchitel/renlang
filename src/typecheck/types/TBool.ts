import TType from './TType';
import TNever from './TNever';


/**
 * Boolean type, contains two values: true and false.
 * Has a wide array of uses.
 */
export default class TBool extends TType {
    isAssignableFrom(t: TType) {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        // only bools can be assigned to other bools
        return t instanceof TBool;
    }

    specifyTypeParams() {
        return this.clone();
    }
    
    isInteger() { return false; }
    isFloat() { return false; }
    isChar() { return false; }
    isBool() { return true; }
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
        return 'bool';
    }
}