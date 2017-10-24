import TType from './TType';


/**
 * 'never' is the empty set for types.
 * It is the type of an intersection between two unrelated types.
 * It is also the return type of a function that never returns.
 * 'never' is (for now) only used to represent the types of statements that cannot
 * contribute to the return value of a function:
 * - break/continue
 * - noop ({})
 * - throw
 * A union of a type A with 'never' is just A.
 * Thus, it is assignable to all types.
 */
export default class TNever extends TType {
    isAssignableFrom() {
        // no types are assignable to "never"
        return false;
    }
    
    specifyTypeParams() {
        return this;
    }

    // 'never' is assignable to all types,
    // meaning that it can be technically used anywhere any type can be used.
    isInteger() { return true; }
    isFloat() { return true; }
    isChar() { return true; }
    isBool() { return true; }
    isTuple() { return true; }
    isStruct() { return true; }
    isArray() { return true; }
    isFunction() { return true; }
    
    hasField() { return false; }

    // return 'this' so that TUnknown can get this behavior
    getBaseType() { return this.clone(); }
    getFieldType() { return this.clone(); }
    getParamCount(): never { throw new Error('never'); }
    getParamTypes(): never { throw new Error('never'); }
    getReturnType() { return this.clone(); }

    toString() {
        return 'never';
    }
}
