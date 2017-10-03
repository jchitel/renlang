/**
 * Base class of all type checking types.
 * These types contain all logic for identifying the types
 * of declarations and expressions, as well as relationships
 * between types.
 */
export class TType {
    /**
     * Determine if this type is assignable to another type.
     * i.e. the following is valid:
     * {variable of type t} = {variable of type this}
     *
     * DO NOT OVERRIDE THIS, IT'S JUST HERE FOR THE SAKE OF EASIER CONCEPTUALITY
     */
    isAssignableTo(t) {
        return t.isAssignableFrom(this);
    }

    /**
     * Determine if another type is assignable to this type.
     * i.e. the following is valid:
     * {variable of type this} = {variable of type t}
     */
    // implement isAssignableFrom(type)

    /**
     * Return an exact (shallow) copy of this instance
     */
    clone() {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
}

/**
 * Integer type, represents a set of integer numbers.
 * Each integer type has a size (in bits) that determines the highest possible value of the type,
 * and a signed flag, indicating whether or not negative values are included.
 */
export class TInteger extends TType {
    constructor(size, signed) {
        super();
        this.size = size;
        this.signed = signed;
    }

    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
        // only integers can be assigned to other integers
        if (!(t instanceof TInteger)) return false;
        // signed ints cannot be assigned to unsigned ints
        if (!this.signed && t.signed) return false;
        // ints of size n can't be assigned to ints of size (<n)
        if (this.size < t.size) return false;
        // unsigned ints cannot be assigned to signed ints of the same size
        if (this.size === t.size && this.signed && !t.signed) return false;
        // we have an integer type which represents either the same or a subset of this's set
        return true;
    }

    specifyTypeParams() {
        return this.clone();
    }

    toString() {
        if (this.size === null || this.signed === null) return 'integer';
        let str = this.signed ? 'signed ' : 'unsigned ';
        if (this.size !== Infinity) {
            str += `${this.size}-bit integer`;
        } else {
            str += 'unbounded integer';
        }
        return str;
    }
}

/**
 * Floating point type, represents a set of potentially fractional numbers.
 * Each floating point type has a size (in bits) that determines the precision of the type.
 * The data of floating point numbers consists of the bits of precision (called the mantissa),
 * the bits of an exponent (the distance from the MSB of the mantissa and the ones place),
 * and the sign of the number.
 */
export class TFloat extends TType {
    constructor(size) {
        super();
        this.size = size;
    }

    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
        // only floats can be assigned to other floats
        if (!(t instanceof TFloat)) return false;
        // floats of size n can't be assigned to floats of size <n
        if (this.size < t.size) return false;
        // we have a float type which represents either the same or a subset of this's set
        return true;
    }

    specifyTypeParams() {
        return this.clone();
    }

    toString() {
        return `${this.size}-bit float`;
    }
}

/**
 * Unicode character type, represents the set of unicode characters.
 * There is only one possible character type.
 */
export class TChar extends TType {
    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
        // only chars can be assigned to other chars
        return t instanceof TChar;
    }

    specifyTypeParams() {
        return this.clone();
    }

    toString() {
        return 'char';
    }
}

/**
 * Boolean type, contains two values: true and false.
 * Has a wide array of uses.
 */
export class TBool extends TType {
    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
        // only bools can be assigned to other bools
        return t instanceof TBool;
    }

    specifyTypeParams() {
        return this.clone();
    }

    toString() {
        return 'bool';
    }
}

/**
 * Tuple type, represents a group of values of several heterogeneous types, including no values at all.
 * TODO: handle type parameters
 */
export class TTuple extends TType {
    constructor(types) {
        super();
        this.types = types;
    }

    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
        // only tuples can be assigned to other tuples
        if (!(t instanceof TTuple)) return false;
        // need to have the same number of values
        if (this.types.length !== t.types.length) return false;
        // test assignability of component types
        for (let i = 0; i < this.types.length; ++i) {
            if (!this.types[i].isAssignableFrom(t.types[i])) return false;
        }
        return true;
    }

    specifyTypeParams(args) {
        const specific = this.clone();
        specific.types = specific.types.map(t => t.specifyTypeParams(args));
        return specific;
    }

    toString() {
        return `(${this.types.map(t => t.toString()).join(', ')})`;
    }
}

/**
 * Struct type, extension of tuple type where the values have names (fields).
 * TODO: handle type parameters
 */
export class TStruct extends TType {
    constructor(fields) {
        super();
        this.fields = fields;
    }

    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
        // only structs can be assigned to other structs
        if (!(t instanceof TStruct)) return false;
        // a type is assignable to this if it has the fields in this and those types are assignable
        // NOTE: this does not mean that t can't have more fields
        for (const k of Object.keys(this.fields)) {
            if (!t.fields[k]) return false;
            if (!this.fields[k].isAssignableFrom(t.fields[k])) return false;
        }
        return true;
    }

    specifyTypeParams(args) {
        const specific = this.clone();
        specific.fields = {};
        for (const k of Object.keys(this.fields)) {
            specific.fields[k] = this.fields[k].specifyTypeParams(args);
        }
        return specific;
    }

    toString() {
        return `{ ${Object.entries(this.fields).map(([k, v]) => `'${v}' ${k}`).join('; ')} }`;
    }
}

/**
 * Array type, variable sized list of homogeneous values (only one type).
 * TODO: handle type parameters
 */
export class TArray extends TType {
    constructor(baseType) {
        super();
        this.baseType = baseType;
    }

    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
        // only arrays can be assigned to other arrays
        if (!(t instanceof TArray)) return false;
        // omitted base type, just needs to be an array
        if (this.baseType === null) return true;
        // the base type needs to be assignable
        return this.baseType.isAssignableFrom(t.baseType);
    }

    specifyTypeParams(args) {
        const specific = this.clone();
        specific.baseType = specific.baseType.specifyTypeParams(args);
        return specific;
    }

    toString() {
        return this.baseType ? `${this.baseType}[]` : '?[]';
    }
}

/**
 * Function type, represented by a group of parameter types and a single return type.
 */
export class TFunction extends TType {
    constructor(paramTypes, returnType, typeParamTypes) {
        super();
        this.paramTypes = paramTypes;
        this.returnType = returnType;
        if (typeParamTypes) this.typeParamtypes = typeParamTypes;
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
    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
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
    completeResolution(explicitType) {
        for (let i = 0; i < this.paramTypes.length; ++i) {
            if (!this.paramTypes[i]) this.paramTypes[i] = explicitType.paramTypes[i];
        }
        this.returnType = explicitType.returnType;
    }

    specifyTypeParams(args) {
        const specific = this.clone();
        specific.paramTypes = specific.paramTypes.map(t => t.specifyTypeParams(args));
        specific.returnType = specific.returnType.specifyTypeParams(args);
        return specific;
    }

    toString() {
        return `(${this.params.map(p => p.toString()).join(', ')}) => ${this.returnType}`;
    }
}

/**
 * Union type, inverse of tuple, there is only one value, but it can be of potentially several types.
 * These are structured as a binary tree.
 * TODO: handle type parameters
 */
export class TUnion extends TType {
    constructor(types) {
        super();
        this.types = types;
    }

    /**
     * This one is fun because t can be either assignable to any of its component types,
     * or it matches part of its component types.
     */
    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
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

    specifyTypeParams(args) {
        const specific = this.clone();
        specific.types = specific.types.map(t => t.specifyTypeParams(args));
        return specific;
    }

    toString() {
        return this.types.map(t => t.toString()).join(' | ');
    }
}

/**
 * Represents a type with type params.
 * 'typeParams' is an object mapping the type parameter names to TParam types.
 * 'type' is the definition of the type, which makes use of the type parameters.
 */
export class TGeneric extends TType {
    constructor(typeParams, paramNames, type) {
        super();
        this.typeParams = typeParams;
        this.paramNames = paramNames;
        this.type = type;
    }

    isAssignableFrom(t) {
        // TODO
    }

    /**
     * Here, we need to clone the type definition and visit it, specifying
     * all instances of TParam. This is where we check the type constraint.
     * TODO: what about generic types that contain generic types?
     */
    specifyTypeParams(args) {
        const specific = this.type.clone();
        // create map of param name -> provided arg
        const argMap = {};
        for (let i = 0; i < args.length; ++i) {
            argMap[this.paramNames[i]] = args[i];
        }
        // visit the type with the map so that params can be replaced with actual types
        return specific.specifyTypeParams(argMap);
    }
}

/**
 * Represents the type of an untyped type parameter, used in TGeneric and wherever
 * a type parameters is used.
 */
export class TParam extends TType {
    constructor(name, variance, constraint) {
        super();
        this.name = name;
        this.variance = variance;
        this.constraint = constraint;
    }

    isAssignableFrom(t) {
        // TODO
    }

    specifyTypeParams(args) {
        const arg = args[this.name];
        // TODO: continue
    }
}

/**
 * "any" type, all types are assignable to "any".
 */
export class TAny extends TType {
    isAssignableFrom() {
        // all types are assignable to "any"
        return true;
    }

    toString() {
        return 'any';
    }
}

/**
 * Represents an unknown type, used in error cases where the type is impossible to be determined.
 * The purpose of this type is as a placeholder so that multiple errors aren't used for the same error case.
 */
export class TUnknown extends TType {
    isAssignableFrom() {
        // this is never supposed to occur, if it happens it is an application error, not a type checker error
        throw new Error('Attempted to type check un-typable value');
    }

    toString() {
        throw new Error('Attempted to display un-typed type');
    }
}

/**
 * We can't have recursively defined objects, so this class serves
 * to represent the point of recursion for a recursively defined type.
 * The assignability of the type is just based on the assignability of
 * the referenced type.
 * TODO: this may not work the way we want it to.
 */
export class TRecursive extends TType {
    constructor(decl) {
        super();
        this.decl = decl;
    }

    isAssignableFrom(t) {
        // unknown is assignable to all types
        if (t instanceof TUnknown) return true;
        return this.decl.type.isAssignableFrom(t);
    }

    toString() {
        return this.decl.type.toString();
    }
}

/**
 * Given two optional types, return the more general one of the two
 */
export function determineGeneralType(type1, type2) {
    // one or both is falsy
    if (!type2) return type1;
    if (!type1) return type2;
    // there is a relationship, select the more general one
    if (type2.isAssignableFrom(type1) && !type1.isAssignableFrom(type2)) return type2;
    if (!type2.isAssignableFrom(type1) && type1.isAssignableFrom(type2)) return type1;
    // no relationship, the only type is any
    if (!type2.isAssignableFrom(type1) && !type1.isAssignableFrom(type2)) return new TAny();
    // types are equivalent
    return type1;
}
