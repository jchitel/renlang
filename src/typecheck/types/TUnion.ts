import TType from './TType';
import TNever from './TNever';
import { SymbolTable } from '../TypeCheckContext';


/**
 * Union type, inverse of tuple, there is only one value, but it can be of potentially several types.
 * These are structured as a binary tree.
 */
export default class TUnion extends TType {
    types: TType[];

    constructor(types: TType[]) {
        super();
        this.types = types;
    }

    /**
     * This one is fun because t can be either assignable to any of its component types,
     * or it matches part of its component types.
     */
    isAssignableFrom(t: TType) {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        if (t instanceof TUnion) {
            // the type is also a union, all of its types must be assignable to types in this
            // ex: (int | bool | char) = (int | bool) // valid
            // ex: (int | bool) = (int | char) // not valid
            for (const st of t.types) {
                if (!this.types.some(tt => tt.isAssignableFrom(st))) return false;
            }
            return true;
        } else {
            // otherwise, it just needs to be assignable to one of our types
            // ex: (int | bool) = int // valid
            // ex: (int | bool) = char // not valid
            for (const tt of this.types) {
                if (tt.isAssignableFrom(t)) return true;
            }
            return false;
        }
    }

    specifyTypeParams(args: SymbolTable<TType>) {
        const specific = this.clone();
        specific.types = specific.types.map(t => t.specifyTypeParams(args));
        return specific;
    }

    visitInferTypeArgumentTypes(argMap: SymbolTable<TType>, argType: TType) {
        for (const type of this.types) {
            type.visitInferTypeArgumentTypes(argMap, argType);
        }
    }

    /**
     * The behavioral attributes can only apply if every component type in the union has them.
     * For intersection types, only one needs to have it.
     */

    isInteger() { return this.types.every(t => t.isInteger()); }
    isFloat() { return this.types.every(t => t.isInteger()); }
    isChar() { return this.types.every(t => t.isChar()); }
    isBool() { return this.types.every(t => t.isBool()); }
    isTuple() { return this.types.every(t => t.isTuple()); }
    isStruct() { return this.types.every(t => t.isStruct()); }
    isArray() { return this.types.every(t => t.isArray()); }
    isFunction() { return this.types.every(t => t.isFunction() && t.getParamCount() === this.types[0].getParamCount()); }
    isGeneric() { return false; }

    hasField(field: string) { return this.types.every(t => t.hasField(field)); }

    /**
     * If all component types are arrays, we just return the union of all the base types.
     */
    getBaseType() {
        if (this.isArray()) {
            return new TUnion(this.types.map(t => t.getBaseType()));
        }
        throw new Error('never');
    }

    getFieldType(field: string) {
        if (this.hasField(field)) {
            return new TUnion(this.types.map(t => t.getFieldType(field)));
        }
        throw new Error('never');
    }

    getParamCount() {
        if (this.isFunction()) {
            return this.types[0].getParamCount();
        }
        throw new Error('never');
    }
    
    getTypeParamCount(): never {
        throw new Error('never');
    }

    getParamTypes() {
        if (this.isFunction()) {
            const returnParamTypes = [];
            const paramTypes = this.types.map(t => t.getParamTypes());
            const count = this.getParamCount();
            for (let i = 0; i < count; ++i) {
                returnParamTypes.push(new TUnion(paramTypes.map(ts => ts[i])));
            }
            return returnParamTypes;
        }
        throw new Error('never');
    }

    getTypeParamTypes(): never {
        throw new Error('never');
    }

    getReturnType() {
        if (this.isFunction()) {
            return new TUnion(this.types.map(t => t.getReturnType()));
        }
        throw new Error('never');
    }

    toString() {
        return this.types.map(t => t.toString()).join(' | ');
    }
}