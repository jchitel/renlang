import { SymbolTable } from '../TypeCheckContext';
import OrderedMap from './OrderedMap';
import TParam from './TParam';


/**
 * Base class of all type checking types.
 * These types contain all logic for identifying the types
 * of declarations and expressions, as well as relationships
 * between types.
 */
export default abstract class TType {
    /**
     * Determine if this type is assignable to another type.
     * i.e. the following is valid:
     * {variable of type t} = {variable of type this}
     *
     * DO NOT OVERRIDE THIS, IT'S JUST HERE FOR THE SAKE OF EASIER CONCEPTUALITY
     */
    isAssignableTo(t: TType) {
        return t.isAssignableFrom(this);
    }

    /**
     * Determine if another type is assignable to this type.
     * i.e. the following is valid:
     * {variable of type this} = {variable of type t}
     */
    abstract isAssignableFrom(t: TType): boolean;

    abstract specifyTypeParams(args: SymbolTable<TType>): TType;

    abstract visitInferTypeArgumentTypes(argMap: SymbolTable<TType>, argType: TType): void;

    /**
     * BEHAVIORAL APIS
     * These APIs allow us to have complex types that still boil down to basic types.
     * This is so that we don't have to do obnoxious instanceof checks.
     */

    abstract isInteger(): boolean;
    abstract isFloat(): boolean;
    abstract isChar(): boolean;
    abstract isBool(): boolean;
    abstract isTuple(): boolean;
    abstract isStruct(): boolean;
    abstract isArray(): boolean;
    abstract isFunction(): boolean;
    abstract isGeneric(): boolean;

    abstract hasField(field: string): boolean;

    abstract getBaseType(): TType;
    abstract getFieldType(field: string): TType;
    abstract getParamCount(): number;
    abstract getTypeParamCount(): number;
    abstract getParamTypes(): TType[];
    abstract getTypeParamTypes(): OrderedMap<TParam>;
    abstract getReturnType(): TType;

    /**
     * Return an exact (shallow) copy of this instance
     */
    clone() {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
}
