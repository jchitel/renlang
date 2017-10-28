import TType from './TType';
import TNever from './TNever';
import { SymbolTable } from '../TypeCheckContext';


/**
 * Array type, variable sized list of homogeneous values (only one type).
 */
export default class TArray extends TType {
    baseType: TType;

    constructor(baseType: TType) {
        super();
        this.baseType = baseType;
    }

    isAssignableFrom(t: TType): boolean {
        // unknown is assignable to all types
        if (t instanceof TNever) return true;
        // only arrays can be assigned to other arrays
        if (!(t instanceof TArray)) return false;
        // omitted base type, just needs to be an array
        if (this.baseType === null) return true;
        // the base type needs to be assignable
        return this.baseType.isAssignableFrom(t.baseType);
    }

    specifyTypeParams(args: SymbolTable<TType>) {
        const specific = this.clone();
        specific.baseType = specific.baseType.specifyTypeParams(args);
        return specific;
    }

    visitInferTypeArgumentTypes(argMap: SymbolTable<TType>, argType: TType) {
        this.baseType.visitInferTypeArgumentTypes(argMap, argType);
    }
    
    isInteger() { return false; }
    isFloat() { return false; }
    isChar() { return false; }
    isBool() { return false; }
    isTuple() { return false; }
    isStruct() { return false; }
    isArray() { return true; }
    isFunction() { return false; }
    isGeneric() { return false; }

    hasField() { return false; }

    getBaseType() { return this.baseType; }
    getFieldType(): never { throw new Error('never'); }
    getParamCount(): never { throw new Error('never'); }
    getTypeParamCount(): never { throw new Error('never'); }
    getParamTypes(): never { throw new Error('never'); }
    getTypeParamTypes(): never { throw new Error('never'); }
    getReturnType(): never { throw new Error('never'); }

    toString() {
        return this.baseType ? `${this.baseType}[]` : '?[]';
    }
}