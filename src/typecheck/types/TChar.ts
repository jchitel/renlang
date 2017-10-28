import TType from './TType';
import TNever from './TNever';


/**
 * Unicode character type, represents the set of unicode characters.
 * There is only one possible character type.
 */
export default class TChar extends TType {
    isAssignableFrom(t: TType) {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        // only chars can be assigned to other chars
        return t instanceof TChar;
    }

    specifyTypeParams() {
        return this.clone();
    }
    
    visitInferTypeArgumentTypes() {}
    
    isInteger() { return false; }
    isFloat() { return false; }
    isChar() { return true; }
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
        return 'char';
    }
}