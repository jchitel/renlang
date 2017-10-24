import TType from './TType';
import TNever from './TNever';
import { SymbolTable } from '../TypeCheckContext';


/**
 * Function type, represented by a group of parameter types and a single return type.
 */
export default class TFunction extends TType {
    paramTypes: TType[];
    returnType: TType;
    typeParamTypes: SymbolTable<TType>;

    constructor(paramTypes: TType[], returnType: TType, typeParamTypes: SymbolTable<TType> = {}) {
        super();
        this.paramTypes = paramTypes;
        this.returnType = returnType;
        if (typeParamTypes) this.typeParamTypes = typeParamTypes;
    }

    /**
     * Function assignability is more complex than other types.
     * We need this relationship to be valid:
     *
     * thisFuncType = (a, b, c) => d
     * tFuncType = (a, b, c) => d
     * retVal = thisFuncType(aVal, bVal, cVal)
     * retVal = tFuncType(aVal, bVal, cVal)
     *
     * The param types of t can be more generic
     * because any values passed to this will be valid as more generic values.
     * The return type has the same relationship as other types
     * because whatever is returned from t has to be a valid value of the
     * return type of this.
     *
     * This means that the return type can be tested the same way,
     * but the param types must be reversed.
     * TODO: handle type parameters
     */
    isAssignableFrom(t: TType) {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        // only functions can be assigned to other functions
        if (!(t instanceof TFunction)) return false;
        // they need to have the same number of params
        if (this.paramTypes.length !== t.paramTypes.length) return false;
        // the return types need to be assignable (assume it's ok if the return type is omitted, as in a lambda)
        if (t.returnType !== null && !this.returnType.isAssignableFrom(t.returnType)) return false;
        // the param types need to be assignable (using the reverse relationship as described above)
        for (let i = 0; i < this.paramTypes.length; ++i) {
            // lambda param types can omit the type, we assume assignability here
            if (t.paramTypes[i] === null) continue;
            if (!t.paramTypes[i].isAssignableFrom(this.paramTypes[i])) return false;
        }
        return true;
    }

    /**
     * Lambdas can omit types for parameters and must omit them for return types,
     * so here is where we know the expected type of the function and can fill in the blanks.
     * We assume here that type checking has already been done, so all we do here is fill in the types.
     */
    completeResolution(explicitType: TType) {
        const paramTypes = explicitType.getParamTypes();
        for (let i = 0; i < this.paramTypes.length; ++i) {
            if (!this.paramTypes[i]) this.paramTypes[i] = paramTypes[i];
        }
        this.returnType = explicitType.getReturnType();
    }

    specifyTypeParams(args: SymbolTable<TType>) {
        const specific = this.clone();
        specific.paramTypes = specific.paramTypes.map(t => t.specifyTypeParams(args));
        specific.returnType = specific.returnType.specifyTypeParams(args);
        return specific;
    }
    
    isInteger() { return false; }
    isFloat() { return false; }
    isChar() { return false; }
    isBool() { return false; }
    isTuple() { return false; }
    isStruct() { return false; }
    isArray() { return false; }
    isFunction() { return true; }
    
    hasField() { return false; }

    getBaseType(): never { throw new Error('never'); }
    getFieldType(): never { throw new Error('never'); }

    getParamCount() {
        return this.paramTypes.length;
    }

    getParamTypes() {
        return this.paramTypes;
    }

    getReturnType() {
        return this.returnType;
    }

    toString() {
        return `(${this.paramTypes.map(p => p.toString()).join(', ')}) => ${this.returnType}`;
    }
}