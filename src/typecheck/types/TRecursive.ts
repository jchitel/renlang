import TType from './TType';
import TNever from './TNever';
import { TypeDeclaration } from '../../syntax/declarations';


/**
 * We can't have recursively defined objects, so this class serves
 * to represent the point of recursion for a recursively defined type.
 * The assignability of the type is just based on the assignability of
 * the referenced type.
 * TODO: this may not work the way we want it to.
 */
export default class TRecursive extends TType {
    decl: TypeDeclaration;

    constructor(decl: TypeDeclaration) {
        super();
        this.decl = decl;
    }

    isAssignableFrom(t: TType) {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        return this.decl.type.isAssignableFrom(t);
    }
    
    specifyTypeParams() {
        return this;
    }
    
    isInteger() { return this.decl.type.isInteger(); }
    isFloat() { return this.decl.type.isFloat(); }
    isChar() { return this.decl.type.isChar(); }
    isBool() { return this.decl.type.isBool(); }
    isTuple() { return this.decl.type.isTuple(); }
    isStruct() { return this.decl.type.isStruct(); }
    isArray() { return this.decl.type.isArray(); }
    isFunction() { return this.decl.type.isFunction(); }

    hasField(field: string) { return this.decl.type.hasField(field); }

    getBaseType() {
        if (this.isArray()) {
            return this.decl.type.getBaseType();
        }
        throw new Error('never');
    }

    getFieldType(field: string) {
        if (this.hasField(field)) {
            return this.decl.type.getFieldType(field);
        }
        throw new Error('never');
    }

    getParamCount() {
        if (this.isFunction()) {
            return this.decl.type.getParamCount();
        }
        throw new Error('never');
    }

    getParamTypes() {
        if (this.isFunction()) {
            return this.decl.type.getParamTypes();
        }
        throw new Error('never');
    }
    
    getReturnType() {
        if (this.isFunction()) {
            return this.decl.type.getReturnType();
        }
        throw new Error('never');
    }

    toString() {
        return this.decl.type.toString();
    }
}