import TType from './TType';
import TParam from './TParam';
import { SymbolTable } from '../TypeCheckContext';
import OrderedMap from './OrderedMap';


/**
 * Represents a type with type params.
 * 'typeParams' is an object mapping the type parameter names to TParam types.
 * 'type' is the definition of the type, which makes use of the type parameters.
 */
export default class TGeneric extends TType {
    typeParams: OrderedMap<TParam>;
    type: TType;

    constructor(typeParams: OrderedMap<TParam>, type: TType) {
        super();
        this.typeParams = typeParams;
        this.type = type;
    }

    isAssignableFrom() {
        // you can't ever just get a generic type without specifying type arguments
        return false;
    }

    specifyTypeParams(_args: SymbolTable<TType>): never {
        throw new Error('never');
    }

    /**
     * Here, we need to clone the type definition and visit it, specifying
     * all instances of TParam. This is where we check the type constraint.
     */
    specifyGenericType(args: TType[]) {
        const specific = this.type.clone();
        // create map of param name -> provided arg
        const argMap: SymbolTable<TType> = {};
        for (let i = 0; i < args.length; ++i) {
            const name = this.typeParams.getKey(i);
            argMap[name] = this.typeParams.get(name).createTypeArg(args[i]);
        }
        // visit the type with the map so that params can be replaced with actual types
        return specific.specifyTypeParams(argMap);
    }

    visitInferTypeArgumentTypes(argMap: SymbolTable<TType>, argType: TType) {
        for (const p of this.typeParams) {
            p.visitInferTypeArgumentTypes(argMap, argType);
        }
    }
    
    isInteger() { return this.type.isInteger(); }
    isFloat() { return this.type.isFloat(); }
    isChar() { return this.type.isChar(); }
    isBool() { return this.type.isBool(); }
    isTuple() { return this.type.isTuple(); }
    isStruct() { return this.type.isStruct(); }
    isArray() { return this.type.isArray(); }
    isFunction() { return this.type.isFunction(); }
    isGeneric() { return true; }
    
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

    getTypeParamCount() {
        return this.getTypeParamTypes.length;
    }

    getParamTypes() {
        return this.type.getParamTypes();
    }

    getTypeParamTypes() {
        return this.typeParams;
    }

    getReturnType() {
        return this.type.getReturnType();
    }
}