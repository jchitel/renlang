import ITypeVisitor from './ITypeVisitor';
import {
    TType, TInteger, TFloat, TChar, TBool, TArray, TStruct, TTuple, TFunction,
    TGeneric, TParam, TArg, TUnion, TAny, TNever, TRecursive,
} from '../types';
import OrderedMap from '../types/OrderedMap';


/**
 * This module defines several visitors for determining if a type
 * has particular behavioral attributes.
 * We will call them "is" visitors because most of them start with "is".
 * Each visitor class is abstracted behind a simple function "isX()".
 * 
 * There are some core attributes that specific types have that may be duplicated
 * across many of these classes. Here is a quick description of them:
 * 
 * Primitive/structured types: these types are boring because due to their inherent
 * properties, they can only behave as themselves. This is fine because they are
 * the base types.
 * 
 * Functions: functions can only be functions, but they can also be generic.
 * 
 * Generic: generic types can be defined as any type, but the types themselves
 * can't actually be directly used anywhere. You can think of generic types
 * as constructors for specific types. In order to actually use a generic type,
 * you need to provide type arguments for it, but then it's no longer a generic
 * type, so this will almost always return false.
 * 
 * Type params: type params can take on behaviors of other types when they are
 * defined with type constraints. For example, a type param with an integer
 * constraint will return true for "isInteger()". A type param with no constraint
 * is behaves as if its constraint is "any".
 * 
 * Type arguments: type arguments are just types with an extra variance layer
 * on top that doesn't apply to them directly. All behavioral logic is defered
 * to this underlying type.
 * 
 * Union types: union types can take on logic of their underlying component
 * types, but only if *all* component types have that property. For example,
 * a union between "int" and "string" cannot be identified as either an int
 * or a string because ints can't be strings, and vice versa. However, a
 * union between "int" and "byte" is an integer because both are integers.
 * 
 * Any: "any" is a union of all types, so this logic is the same as union
 * types if the type was defined with all types in existence. Because there
 * are types included in "any" that do not have each behavioral property,
 * "any" will return false for almost all properties.
 * 
 * Never: "never" is an intersection of all types, so the logic is inverted
 * from "any". "never" can act as an integer, an array, a struct, whatever.
 * "unknown" is a subtype of "never" so it behaves the same way.
 */

abstract class GenericVisitor<T> implements ITypeVisitor<T> {
    visitInteger(_type: TInteger): T { throw new Error("Method not implemented."); }
    visitFloat(_type: TFloat): T { throw new Error("Method not implemented."); }
    visitChar(_type: TChar): T { throw new Error("Method not implemented."); }
    visitBool(_type: TBool): T { throw new Error("Method not implemented."); }
    visitArray(_type: TArray): T { throw new Error("Method not implemented."); }
    visitStruct(_type: TStruct): T { throw new Error("Method not implemented."); }
    visitTuple(_type: TTuple): T { throw new Error("Method not implemented."); }
    visitFunction(_type: TFunction): T { throw new Error("Method not implemented."); }
    visitGeneric(_type: TGeneric): T { throw new Error("Method not implemented."); }
    visitParam(type: TParam): T { return type.constraint.visit(this); }
    visitArg(type: TArg): T { return type.type.visit(this); }
    visitUnion(_type: TUnion): T { throw new Error("Method not implemented."); }
    visitAny(_type: TAny): T { throw new Error("Method not implemented."); }
    visitNever(_type: TNever): T { throw new Error("Method not implemented."); }
    visitRecursive(type: TRecursive): T { return type.decl.type.visit(this); }  
}


/**
 * This is the base class for all "isX()" visitors.
 * Subclasses can override this for each type.
 */
abstract class IsXVisitor implements ITypeVisitor<bool> {
    visitInteger(_type: TInteger): boolean { return false; }
    visitFloat(_type: TFloat): boolean { return false; }
    visitChar(_type: TChar): boolean { return false; }
    visitBool(_type: TBool): boolean { return false; }
    visitArray(_type: TArray): boolean { return false; }
    visitStruct(_type: TStruct): boolean { return false; }
    visitTuple(_type: TTuple): boolean { return false; }
    visitFunction(_type: TFunction): boolean { return false; }
    visitGeneric(_type: TGeneric): boolean { return false; }
    visitParam(type: TParam): boolean { return type.constraint.visit(this); }
    visitArg(type: TArg): boolean { return type.type.visit(this); }
    visitUnion(type: TUnion): boolean { return type.types.every(t => t.visit(this)); }
    visitAny(_type: TAny): boolean { return false; }
    visitNever(_type: TNever): boolean { return true; }
    visitRecursive(type: TRecursive): boolean { return type.decl.type.visit(this); }
}

/**
 * "is <type>" visitors
 */

export class IsIntegerVisitor extends IsXVisitor { visitInteger() { return true; } }
export class IsFloatVisitor extends IsXVisitor { visitFloat() { return true; } }
export class IsCharVisitor extends IsXVisitor { visitChar() { return true; } }
export class IsBoolVisitor extends IsXVisitor { visitBool() { return true; } }
export class IsArrayVisitor extends IsXVisitor { visitArray() { return true; } }
export class IsStructVisitor extends IsXVisitor { visitStruct() { return true; } }
export class IsTupleVisitor extends IsXVisitor {
    visitTuple() { return true; }
    visitUnion(type: TUnion): boolean {
        const length = type.types[0].isTuple() ? type.types[0].getTupleTypes().length : 0;
        return type.types.every(t => t.isTuple() && length === type.types[0].getTupleTypes().length);
    }
}
export class IsFunctionVisitor extends IsXVisitor {
    visitFunction() { return true; }
    visitUnion(type: TUnion): boolean {
        const length = type.types[0].isFunction() ? type.types[0].getParams().length : 0;
        return type.types.every(t => t.isFunction() && length === type.types[0].getParams().length);
    }
}
export class IsGenericVisitor extends IsXVisitor {
    visitGeneric() { return true; }
    visitFunction(type: TFunction) { return !!type.typeParamTypes.length; }
    visitUnion() { return false; }
}
export class IsNeverVisitor extends IsXVisitor {}

/**
 * "is <behavior>"/"has <behavior>" visitors
 */

export class IsSignedVisitor extends IsXVisitor {
    visitInteger(type: TInteger) { return type.signed; }
    visitFloat() { return true; }
}

export class HasFieldVisitor extends IsXVisitor {
    field: string;

    constructor(field: string) {
        super();
        this.field = field;
    }

    visitStruct(type: TStruct): boolean { return type.fields.hasOwnProperty(this.field); }
}

/**
 * "get <property>" visitors
 */

export class GetSizeVisitor extends GenericVisitor<number> {
    visitInteger(type: TInteger) { return type.size; }
    visitFloat(type: TFloat) { return type.size; }
}

export class GetBaseTypeVisitor extends GenericVisitor<TType> {
    visitArray(type: TArray) { return type.baseType; }
    visitUnion(type: TUnion): TType { return new TUnion(type.types.map(t => t.visit(this))); }
    visitNever(type: TNever) { return type; }
}

export class GetFieldVisitor extends GenericVisitor<TType> {
    field: string;

    constructor(field: string) {
        super();
        this.field = field;
    }

    visitStruct(type: TStruct) { return type.fields[this.field]; }
    visitUnion(type: TUnion): TType { return new TUnion(type.types.map(t => t.visit(this))); }
}

export class GetTupleTypesVisitor extends GenericVisitor<TType[]> {
    visitTuple(type: TTuple) { return type.types; }
    visitUnion(type: TUnion): TType[] {
        const tupleTypes = [];
        const types = type.types.map(t => t.visit(this));
        for (let i = 0; i < types[0].length; ++i) {
            tupleTypes.push(new TUnion(types.map(ts => ts[i])));
        }
        return tupleTypes;
    }
}

export class GetParamsVisitor extends GenericVisitor<TType[]> {
    visitFunction(type: TFunction) { return type.paramTypes; }
    visitUnion(type: TUnion): TType[] {
        const paramTypes = [];
        const types = type.types.map(t => t.visit(this));
        for (let i = 0; i < types[0].length; ++i) {
            paramTypes.push(new TUnion(types.map(ts => ts[i])));
        }
        return paramTypes;
    }
}

export class GetTypeParamsVisitor extends GenericVisitor<OrderedMap<TParam>> {
    visitGeneric(type: TGeneric) { return type.typeParams; }
    visitFunction(type: TFunction) { return type.typeParamTypes; }
}

export class GetReturnTypeVisitor extends GenericVisitor<TType> {
    visitFunction(type: TFunction) { return type.returnType; }
    visitUnion(type: TUnion): TType { return new TUnion(type.types.map(t => t.visit(this))); }
}
