import TType from './TType';
import TParam from './TParam';
import { SymbolTable } from '../TypeCheckContext';


/**
 * Represents a type with type params.
 * 'typeParams' is an object mapping the type parameter names to TParam types.
 * 'type' is the definition of the type, which makes use of the type parameters.
 */
export default class TGeneric extends TType {
    typeParams: SymbolTable<TType>;
    paramNames: string[];
    type: TType;

    constructor(typeParams: { [name: string]: TParam }, paramNames: string[], type: TType) {
        super();
        this.typeParams = typeParams;
        this.paramNames = paramNames;
        this.type = type;
    }

    isAssignableFrom(_t: TType) {
        // TODO
        return false;
    }

    specifyTypeParams(_args: SymbolTable<TType>): never {
        throw new Error('never');
    }

    /**
     * Here, we need to clone the type definition and visit it, specifying
     * all instances of TParam. This is where we check the type constraint.
     * TODO: what about generic types that contain generic types?
     */
    specifyGenericType(args: TType[]) {
        const specific = this.type.clone();
        // create map of param name -> provided arg
        const argMap: SymbolTable<TType> = {};
        for (let i = 0; i < args.length; ++i) {
            argMap[this.paramNames[i]] = args[i];
        }
        // visit the type with the map so that params can be replaced with actual types
        return specific.specifyTypeParams(argMap);
    }
    
    isInteger() { return this.type.isInteger(); }
    isFloat() { return this.type.isFloat(); }
    isChar() { return this.type.isChar(); }
    isBool() { return this.type.isBool(); }
    isTuple() { return this.type.isTuple(); }
    isStruct() { return this.type.isStruct(); }
    isArray() { return this.type.isArray(); }
    isFunction() { return this.type.isFunction(); }
    
    hasField(field: string) { return this.type.hasField(field); }

    getBaseType() {
        return this.type.getBaseType();
    }

    getFieldType(field: string) {
        return this.type.getFieldType(field);
    }

    getParamCount() {
        return this.type.getParamCount();
    }

    getParamTypes() {
        return this.type.getParamTypes();
    }

    getReturnType() {
        return this.type.getReturnType();
    }
}