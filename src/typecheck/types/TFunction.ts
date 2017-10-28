import TType from './TType';
import TNever from './TNever';
import { SymbolTable } from '../TypeCheckContext';
import TParam from './TParam';
import OrderedMap from './OrderedMap';


/**
 * Function type, represented by a group of parameter types and a single return type.
 */
export default class TFunction extends TType {
    paramTypes: TType[];
    returnType: TType;
    typeParamTypes: OrderedMap<TParam>;

    constructor(paramTypes: TType[], returnType: TType, typeParamTypes: OrderedMap<TParam> = new OrderedMap()) {
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

    visitInferTypeArgumentTypes(argMap: SymbolTable<TType>, argType: TType) {
        for (const param of this.paramTypes) {
            param.visitInferTypeArgumentTypes(argMap, argType);
        }
        this.returnType.visitInferTypeArgumentTypes(argMap, argType);
    }

    /**
     * Given a list of argument types used to call this function,
     * infer and return the list of corresponding type argument types.
     * This is a fairly complex process, but effectively it involves
     * visiting the parameter types with the argument types,
     * and whenever a type parameter type is encountered, the corresponding
     * type in the argument type is assigned as the type parameter type.
     * 
     * NOTE: This method assumes that the argument types are at least assignable
     * to the parameter types, so it is necessary to verify assignability BEFORE
     * calling this.
     */
    inferTypeArgumentTypes(argTypes: TType[]) {
        // map of type param name -> inferred type arg
        const argMap: SymbolTable<TType> = {};
        for (const key of this.typeParamTypes.keys()) {
            // start with never because it is assignable to everything
            argMap[key] = new TNever();
        }
        // visit each parameter type
        for (let i = 0; i < this.paramTypes.length; ++i) {
            this.paramTypes[i].visitInferTypeArgumentTypes(argMap, argTypes[i]);
        }
        return this.typeParamTypes.keys().map(k => argMap[k]);
    }

    /**
     * Given a list of type arguments for this function, fill in the parameter types
     * and return the list of resulting parameter types.
     */
    getSpecificParamTypes(typeArgTypes: TType[]) {
        // create map of type param name -> provided type arg
        const argMap: SymbolTable<TType> = {};
        for (let i = 0; i < typeArgTypes.length; ++i) {
            const name = this.typeParamTypes.getKey(i);
            argMap[name] = this.typeParamTypes.get(name).createTypeArg(typeArgTypes[i]);
        }
        // visit each param type with the map so that type params can be replaced with actual types
        return this.paramTypes.map(type => type.clone().specifyTypeParams(argMap));
    }

    /**
     * Given a list of type arguments for this function, fill in the return type
     * and return the resulting return type.
     */
    getSpecificReturnType(typeArgTypes: TType[]) {
        // create map of type param name -> provided type arg
        const argMap: SymbolTable<TType> = {};
        for (let i = 0; i < typeArgTypes.length; ++i) {
            const name = this.typeParamTypes.getKey(i);
            argMap[name] = this.typeParamTypes.get(name).createTypeArg(typeArgTypes[i]);
        }
        // visit the return type with the map so that type params can be replaced with actual types
        return this.returnType.clone().specifyTypeParams(argMap);
    }
    
    isInteger() { return false; }
    isFloat() { return false; }
    isChar() { return false; }
    isBool() { return false; }
    isTuple() { return false; }
    isStruct() { return false; }
    isArray() { return false; }
    isFunction() { return true; }
    isGeneric() { return !!this.typeParamTypes && !!this.typeParamTypes.length; }
    
    hasField() { return false; }

    getBaseType(): never { throw new Error('never'); }
    getFieldType(): never { throw new Error('never'); }

    getParamCount() {
        return this.paramTypes.length;
    }

    getTypeParamCount() {
        if (this.isGeneric()) return this.typeParamTypes.length;
        throw new Error('never');
    }

    getParamTypes() {
        return this.paramTypes;
    }

    getTypeParamTypes() {
        if (this.isGeneric()) return this.typeParamTypes;
        throw new Error('never');
    }

    getReturnType() {
        return this.returnType;
    }

    toString() {
        return `(${this.paramTypes.map(p => p.toString()).join(', ')}) => ${this.returnType}`;
    }
}