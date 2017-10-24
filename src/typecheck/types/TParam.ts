import TType from './TType';
import { SymbolTable } from '../TypeCheckContext';


type Variance = 'covariant' | 'contravariant' | 'invariant';

/**
 * Represents the type of an untyped type parameter, used in TGeneric and wherever
 * a type parameters is used.
 */
export default class TParam extends TType {
    name: string;
    variance: Variance;
    constraint: TType;

    constructor(name: string, variance: Variance, constraint: TType) {
        super();
        this.name = name;
        this.variance = variance;
        this.constraint = constraint;
    }

    isAssignableFrom(t: TType): boolean {
        // TODO
        return t instanceof TParam;
    }

    specifyTypeParams(args: SymbolTable<TType>) {
        const arg = args[this.name];
        // TODO: continue
        arg;
        return this;
    }
    
    isInteger() { return this.constraint ? this.constraint.isInteger() : false; }
    isFloat() { return this.constraint ? this.constraint.isFloat() : false;; }
    isChar() { return this.constraint ? this.constraint.isChar() : false; }
    isBool() { return this.constraint ? this.constraint.isBool() : false; }
    isTuple() { return this.constraint ? this.constraint.isTuple() : false; }
    isStruct() { return this.constraint ? this.constraint.isStruct() : false; }
    isArray() { return this.constraint ? this.constraint.isArray() : false; }
    isFunction() { return this.constraint ? this.constraint.isFunction() : false; }

    hasField(field: string) { return this.constraint ? this.constraint.hasField(field) : false; }

    getBaseType() {
        if (this.isArray()) {
            return this.constraint.getBaseType();
        }
        throw new Error('never');
    }

    getFieldType(field: string) {
        if (this.hasField(field)) {
            return this.constraint.getFieldType(field);
        }
        throw new Error('never');
    }

    getParamCount() {
        if (this.isFunction()) {
            return this.constraint.getParamCount();
        }
        throw new Error('never');
    }
    
    getParamTypes() {
        if (this.isFunction()) {
            return this.constraint.getParamTypes();
        }
        throw new Error('never');
    }
    
    getReturnType() {
        if (this.isFunction()) {
            return this.constraint.getReturnType();
        }
        throw new Error('never');
    }
}