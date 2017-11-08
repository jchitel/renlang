import ITypeVisitor from './ITypeVisitor';
import {
    TType, TInteger, TFloat, TChar, TBool, TArray, TStruct, TTuple, TFunction,
    TGeneric, TParam, TArg, TUnion, TAny, TNever, TRecursive,
} from '~/typecheck/types';


/**
 * Determines if any type is assignable from a type.
 *
 * Reading the below can seem a bit confusing.
 * Here's some context to try to make sense of it.
 * 
 * ## Assignability
 * 
 * When we talk about "assignability", we're talking about
 * the ability of values of a "from" type to be "assigned"
 * to values of a "to" type.
 * For example, 16-bit integers are assignable to 32-bit
 * integers because the set of 16-bit integers falls into
 * the set of 32-bit integers. The reverse is not true
 * because there are 32-bit integers that cannot be represented
 * by a 16-bit value.
 * 
 * ## Assignability to vs. from
 * 
 * The reason that we check assignability "from" as opposed
 * to assignability "to" is because when these checks need to be made,
 * it is usually the "to" type that is known, and the "from" type can
 * be any type.
 * For example, when we are doing an "add" operation, we expect numbers
 * to be used. So when we are checking the type of value being used
 * in the operation, we don't need to know that "from" type, but we do
 * know that the "to" type is a number.
 * This holds true with most type checking operations, so we treat the
 * operation as checking if a specific type is assignable "from" some
 * arbitrary type.
 * 
 * ## Assignability with the visitor pattern
 * 
 * With the visitor pattern, you have an operation that exists for
 * each type in a given set of types, and that operation may have
 * parameters. To the "visitee", those parameters are provided
 * as parameters to its "visit()" (or "accept()") function.
 * But the "visitor" (this class for example) stores the operation
 * parameters on the instance of itself, and the object being
 * operated on is provided as a parameter to each visit() method.
 * Because we check assignability "from", this means that the object
 * being operated on is the "to" type, and the parameter of the
 * operation is the "from" type. Thus, the "from" type is stored
 * on the AssignmentVisitor instance, and the "to" type is provided
 * as a parameter to each "visit()" method.
 * To illustrate this, here is an example call stack for an
 * AssignmentVisitor operation (assuming "to" is a TInteger):
 * 
 * 1. someplace:                        toType.isAssignableFrom(from: fromType)
 * 2. TInteger.isAssignableFrom():      this.visit(visitor: new AssignmentVisitor(from: fromType))
 * 3. TInteger.visit():                 visitor.visitInteger(to: this)
 * 4. AssignmentVisitor.visitInteger(): Now `this.from` and parameter `to` are the operands.
 */
export default class AssignmentVisitor implements ITypeVisitor<bool> {
    from: TType;

    constructor(from: TType) {
        this.from = from;
    }

    @baseCheck
    visitInteger(to: TInteger): boolean {
        // only integers can be assigned to other integers
        if (!this.from.isInteger()) return false;
        // signed ints cannot be assigned to unsigned ints
        const toSigned = to.isSigned(), fromSigned = this.from.isSigned();
        if (!toSigned && fromSigned) return false;
        // ints of size n can't be assigned to ints of size (<n)
        const toSize = to.getSize(), fromSize = this.from.getSize();
        if (toSize < fromSize) return false;
        // unsigned ints cannot be assigned to signed ints of the same size
        if (toSize === fromSize && toSigned && !fromSigned) return false;
        return true;
    }

    @baseCheck
    visitFloat(to: TFloat): boolean {
        // only floats can be assigned to other floats
        if (!this.from.isFloat()) return false;
        // floats of size n can't be assigned to floats of size <n
        if (to.getSize() < this.from.getSize()) return false;
        return true;
    }

    @baseCheck
    visitChar(_to: TChar): boolean {
        // only chars can be assigned to other chars
        return this.from.isChar();
    }

    @baseCheck
    visitBool(_to: TBool): boolean {
        // only bools can be assigned to other bools
        return this.from.isBool();
    }

    @baseCheck
    visitArray(to: TArray): boolean {
        // only arrays can be assigned to other arrays
        if (!this.from.isArray()) return false;
        // the base type needs to be assignable
        return to.getBaseType().isAssignableFrom(this.from.getBaseType());
    }

    @baseCheck
    visitStruct(to: TStruct): boolean {
        // only structs can be assigned to other structs
        if (!this.from.isStruct()) return false;
        // a type is assignable to this if it has the fields in this and those types are assignable
        // NOTE: this does not mean that t can't have more fields
        for (const k of Object.keys(to.fields)) {
            if (!this.from.hasField(k)) return false;
            if (!to.fields[k].isAssignableFrom(this.from.getField(k))) return false;
        }
        return true;
    }

    @baseCheck
    visitTuple(to: TTuple): boolean {
        // only tuples can be assigned to other tuples
        if (!this.from.isTuple()) return false;
        // need to have the same number of values
        const fromTypes = this.from.getTupleTypes(), toTypes = to.getTupleTypes();
        if (toTypes.length !== fromTypes.length) return false;
        // test assignability of component types
        for (let i = 0; i < fromTypes.length; ++i) {
            if (!toTypes[i].isAssignableFrom(fromTypes[i])) return false;
        }
        return true;
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
    @baseCheck
    visitFunction(to: TFunction): boolean {
        // only functions can be assigned to other functions
        if (!this.from.isFunction()) return false;
        // they need to have the same number of params
        const fromParams = this.from.getParams(), toParams = to.getParams();
        if (toParams.length !== fromParams.length) return false;
        // the return types need to be assignable (assume it's ok if the return type is omitted, as in a lambda)
        const fromReturnType = this.from.getReturnType(), toReturnType = to.getReturnType();
        if (!toReturnType.isAssignableFrom(fromReturnType)) return false;
        // the param types need to be assignable (using the reverse relationship as described above)
        for (let i = 0; i < fromParams.length; ++i) {
            if (!fromParams[i].isAssignableFrom(toParams[i])) return false;
        }
        return true;
    }

    visitGeneric(_to: TGeneric): boolean {
        // you can't ever just get a generic type without specifying type arguments
        return false;
    }

    @baseCheck
    visitParam(to: TParam): boolean {
        return to.constraint.visit(this);
    }

    /**
     * A type is only assignable to an argument type if it
     * satisfies the variance constraint against the argument's type.
     */
    @baseCheck
    visitArg(to: TArg): boolean {
        if (to.variance === 'covariant') {
            // the type must be assignable to our type
            return to.type.visit(this);
        } else if (to.variance === 'contravariant') {
            // our type must be assignable to the type
            return this.from.isAssignableFrom(to.type);
        } else {
            // invariant, both must be true
            return to.type.visit(this) && this.from.isAssignableFrom(to.type);
        }
    }

    @baseCheck
    visitUnion(to: TUnion): boolean {
        if (this.from instanceof TUnion) {
            // the type is also a union, all of its types must be assignable to types in this
            // ex: (int | bool | char) = (int | bool) // valid
            // ex: (int | bool) = (int | char) // not valid
            for (const st of this.from.types) {
                if (!to.types.some(tt => tt.isAssignableFrom(st))) return false;
            }
            return true;
        } else {
            // otherwise, it just needs to be assignable to one of our types
            // ex: (int | bool) = int // valid
            // ex: (int | bool) = char // not valid
            for (const tt of to.types) {
                if (tt.visit(this)) return true;
            }
            return false;
        }
    }

    @baseCheck
    visitAny(_to: TAny): boolean {
        // all types are assignable to any
        return true;
    }

    @baseCheck
    visitNever(_to: TNever): boolean {
        // no types are assignable to never
        return false;
    }

    @baseCheck
    visitRecursive(to: TRecursive): boolean {
        return to.decl.type.visit(this);
    }
}

/**
 * Base check to do before any other visitor logic.
 * This is to prevent us from repeating ourselves.
 */
function doBaseCheck(this: AssignmentVisitor, _type: TType): Optional<bool> {
    // never is assignable to all types
    if (this.from.isNever()) return true;
    return null;
}

function baseCheck(_target: AssignmentVisitor, _name: string, desc: TypedPropertyDescriptor<(type: TType) => bool>) {
    const orig = desc.value as (type: TType) => bool;
    desc.value = function(type: TType) {
        // do the base check
        const val = doBaseCheck.call(this, type) as Optional<bool>;
        // if a value was returned, use that
        if (typeof val === 'boolean') return val;
        // otherwise call the original function
        return orig.call(this, type);
    };
}
