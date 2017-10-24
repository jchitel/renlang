import TType from './TType';


/**
 * "any" type, all types are assignable to "any".
 * This type is NOT the "catch all" type that it is in TypeScript.
 * It is a type that can be used to RECEIVE any type.
 * That inherently means that because it can be any type,
 * it CANNOT be used for any specific type.
 * The only type that can do that is 'never', which is the opposite
 * of 'any'.
 * 'any' should be thought of as the supertype of all types.
 */
export default class TAny extends TType {
    isAssignableFrom() {
        // all types are assignable to "any"
        return true;
    }

    specifyTypeParams() {
        return this;
    }
    
    /**
     * Because 'any' is the union of all types, not the intersection of all types,
     * it cannot identify as any particular type.
     */

    isInteger() { return false; }
    isFloat() { return false; }
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
        return 'any';
    }
}
