import TType from './TType';
import { SymbolTable } from '../TypeCheckContext';
import TNever from './TNever';


export type Variance = 'covariant' | 'contravariant' | 'invariant';

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
        return this.constraint.isAssignableFrom(t);
    }

    createTypeArg(t: TType) {
        return new TArg(this, t);
    }

    specifyTypeParams(args: SymbolTable<TType>) {
        return args[this.name];
    }

    /**
     * This is the leaf visitor method for this process.
     * What we want to do is determine if there is an assignability
     * relationship between the existing assigned type and the type we've arrived at here.
     * If there isn't one, we just keep the existing one, the next type checking step
     * will catch it.
     */
    visitInferTypeArgumentTypes(argMap: SymbolTable<TType>, argType: TType) {
        const currentAssignedType = argMap[this.name];
        if (argType.isAssignableFrom(currentAssignedType)) {
            // use the more general one
            argMap[this.name] = argType;
        }
        // if we have arrived here, either the more general one is already assigned,
        // or there is no assignability relationship, so we are keeping the existing one.
    }
    
    isInteger() { return this.constraint ? this.constraint.isInteger() : false; }
    isFloat() { return this.constraint ? this.constraint.isFloat() : false;; }
    isChar() { return this.constraint ? this.constraint.isChar() : false; }
    isBool() { return this.constraint ? this.constraint.isBool() : false; }
    isTuple() { return this.constraint ? this.constraint.isTuple() : false; }
    isStruct() { return this.constraint ? this.constraint.isStruct() : false; }
    isArray() { return this.constraint ? this.constraint.isArray() : false; }
    isFunction() { return this.constraint ? this.constraint.isFunction() : false; }
    isGeneric() { return this.constraint ? this.constraint.isGeneric() : false; }

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
    
    getTypeParamCount() {
        if (this.isGeneric()) {
            return this.constraint.getTypeParamCount();
        }
        throw new Error('never');
    }
    
    getParamTypes() {
        if (this.isFunction()) {
            return this.constraint.getParamTypes();
        }
        throw new Error('never');
    }

    getTypeParamTypes() {
        if (this.isGeneric()) {
            return this.constraint.getTypeParamTypes();
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

export class TArg extends TType {
    variance: Variance;
    type: TType;

    constructor(param: TParam, type: TType) {
        super();
        this.variance = param.variance;
        this.type = type;
    }

    /**
     * A type is only assignable to an argument type if it
     * satisfies the variance constraint against the argument's type.
     */
    isAssignableFrom(t: TType) {
        // never is assignable to all types
        if (t instanceof TNever) return true;
        if (this.variance === 'covariant') {
            // the type must be assignable to our type
            return this.type.isAssignableFrom(t);
        } else if (this.variance === 'contravariant') {
            // our type must be assignable to the type
            return t.isAssignableFrom(this.type);
        } else {
            // invariant, both must be true
            return this.type.isAssignableFrom(t) && t.isAssignableFrom(this.type);
        }
    }

    specifyTypeParams() {
        return this;
    }

    visitInferTypeArgumentTypes(argMap: SymbolTable<TType>, argType: TType) {
        return this.type.visitInferTypeArgumentTypes(argMap, argType);
    }
    
    isInteger() { return this.type.isInteger(); }
    isFloat() { return this.type.isFloat(); }
    isChar() { return this.type.isChar(); }
    isBool() { return this.type.isBool(); }
    isTuple() { return this.type.isTuple(); }
    isStruct() { return this.type.isStruct(); }
    isArray() { return this.type.isArray(); }
    isFunction() { return this.type.isFunction(); }
    isGeneric() { return this.type.isGeneric(); }

    hasField(name: string) { return this.type.hasField(name); }

    getBaseType() { return this.type.getBaseType(); }
    getFieldType(field: string) { return this.type.getFieldType(field); }
    getParamCount() { return this.type.getParamCount(); }
    getTypeParamCount() { return this.type.getTypeParamCount(); }
    getParamTypes() { return this.type.getParamTypes(); }
    getTypeParamTypes() { return this.type.getTypeParamTypes(); }
    getReturnType() { return this.type.getReturnType(); }
}
