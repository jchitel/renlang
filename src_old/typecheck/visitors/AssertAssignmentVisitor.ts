import ITypeVisitor from './ITypeVisitor';
import {
    TType, TInteger, TFloat, TChar, TBool, TArray, TStruct, TTuple, TFunction,
    TGeneric, TParam, TArg, TUnion, TAny, TNever, TRecursive, TInferred, TParams, TArgs,
    TNamespace
} from '~/typecheck/types';
import { TOverloadedGeneric } from '~/typecheck/types/TGeneric';
import TypeChecker from '~/typecheck/TypeChecker';
import TypeErrorContext from '~/typecheck/TypeErrorContext';
import preVisit from '~/utils/preVisit';
import { range } from '~/utils/utils';


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


class EscapeError extends Error {}

/**
 * This visitor takes an 'expected' type and compares it with another 'actual' type for assignment.
 * There is an optional 'inverted' flag that controls the direction of the relationship:
 * - if 'inverted' is false, you are seeing if the actual type is assignable to the expected type (normal case)
 * - if 'inverted' is true, you are seeing if the expected type is assignable to the actual type (inverted case)
 * The check will have one of three results:
 * - the assignment will be valid, and the visitor will return true
 * - the assignment will be found invalid, an error will be created using the 'actual' type's locataion and an
 *   escape error will be thrown to exit the visitor
 * - the assignment will be found invalid, but the 'actual' type has no location, so false will be returned,
 *   and the first of its ancestors that has a location will be used to create the error
 */
@preVisit()
export default class AssertAssignmentVisitor implements ITypeVisitor<bool, TType> {
    private error: TypeErrorContext;
    private running: boolean = false;

    constructor(private typeChecker: TypeChecker, private target: 'from' | 'to') {
        this.error = new TypeErrorContext(typeChecker.errors);
    }

    private getTarget(to: TType, from: TType) {
        return this.target === 'from' ? from : to;
    }

    private invertTarget() {
        if (this.target === 'from') return 'to';
        return 'from';
    }

    private typeMismatch(to: TType, from: TType) {
        const target = this.getTarget(to, from);
        // this level has no location, forward to parent
        if (!target.location) return false;
        // there is a location, add error and throw
        this.error.typeMismatch(from, to, target.location);
        throw new EscapeError();
    }

    /**
     * When the expected type needs to be drilled down into,
     * a more complex child visit is required, which actually
     * needs to create a new visitor off of this one.
     * For all intents and purposes, the new visitor can be thought of
     * as identical to the original, just with a new expected type,
     * and optionally a new 'inverted' flag (e.g. for function params).
     */
    private fork(to: TType, from: TType, target = this.target) {
        const newVisitor = new AssertAssignmentVisitor(this.typeChecker, target);
        newVisitor.running = true;
        return to.visit(newVisitor, from);
    }

    private callWithCatch(func: () => bool) {
        try {
            return func();
        } catch (err) {
            if (err instanceof EscapeError) return false;
            throw err;
        }
    }

    /**
     * For nested types with mutliple child types, we need to handle
     * the true/false/throw logic correctly.
     * Basically, in all cases, all children need to be visited.
     * If all return true, the result is true.
     * If none throw but at least one returns false, the result is false.
     * In that instance the parent can create an error just like normal.
     * If at least one throws, the result is to throw.
     */
    private wrapChildren<T>(children: Iterable<T>, func: (child: T) => bool) {
        let success = true, thrown = false;
        for (const child of children) {
            try {
                success = func(child);
            } catch (err) {
                if (err instanceof EscapeError) thrown = true;
                else throw err;
            }
        }
        if (success) return true;
        if (thrown) throw new EscapeError();
        return false;
    }

    /**
     * This pre-visitor is designed to capture where the visitor is entered.
     * When the first visit is called, 'this.running' will be false, meaning
     * that the visitor has just started. 'this.running' is immediately
     * set to true so that child callers know that they are not the top-level.
     * Only in the instance of the top-level, the visitor is wrapped in a try-catch,
     * so that escape errors are caught and converted to a false result.
     * All other visitors are simply called so that the escape error ascends
     * to the top.
     */
    preVisit(visitor: () => bool) {
        const running = !this.running;
        this.running = true;
        if (running) {
            return this.callWithCatch(() => {
                const result = visitor();
                if (!result) throw new Error('No location specified for assignment error');
                return result;
            });
        } else {
            return visitor();
        }
    }

    visitInteger(to: TInteger, from: TType): boolean {
        // only integers can be assigned to other integers
        if (!from.isInteger()) return this.typeMismatch(to, from);
        // signed ints cannot be assigned to unsigned ints
        const toSigned = to.isSigned(), fromSigned = from.isSigned();
        if (!toSigned && fromSigned) return this.typeMismatch(to, from);
        // ints of size n can't be assigned to ints of size (<n)
        const toSize = to.getSize(), fromSize = from.getSize();
        if (toSize < fromSize) return this.typeMismatch(to, from);
        // unsigned ints cannot be assigned to signed ints of the same size
        if (toSize === fromSize && toSigned && !fromSigned) return this.typeMismatch(to, from);
        return true;
    }

    visitFloat(to: TFloat, from: TType): boolean {
        // only floats can be assigned to other floats
        if (!from.isFloat()) return this.typeMismatch(to, from);
        // floats of size n can't be assigned to floats of size <n
        if (to.getSize() < from.getSize()) return this.typeMismatch(to, from);
        return true;
    }

    visitChar(to: TChar, from: TType): boolean {
        // only chars can be assigned to other chars
        return from.isChar() || this.typeMismatch(to, from);
    }

    visitBool(to: TBool, from: TType): boolean {
        // only bools can be assigned to other bools
        return from.isBool() || this.typeMismatch(to, from);
    }

    visitArray(to: TArray, from: TType): boolean {
        // only arrays can be assigned to other arrays
        if (!from.isArray()) return this.typeMismatch(to, from);
        // the base type needs to be assignable
        return to.visit(this, from);
    }

    visitStruct(to: TStruct, from: TType): boolean {
        // only structs can be assigned to other structs
        if (!from.isStruct()) return this.typeMismatch(to, from);
        // 'from' is assignable to 'to' only if 'from' has at least the fields in 'to'
        // and the types of those fields are assignable
        const success = this.wrapChildren(to.getFields(), k => {
            if (!from.hasField(k)) return this.typeMismatch(to, from);
            return to.getField(k).visit(this, from.getField(k));
        });
        if (!success) return this.typeMismatch(to, from);
        return true;
    }

    visitTuple(to: TTuple, from: TType): boolean {
        // only tuples can be assigned to other tuples
        if (!from.isTuple()) return this.typeMismatch(to, from);
        // 'from' is assignable to 'to' only if 'from' has at least as many items as 'to'
        // and the types of those items are assignable
        const fromTypes = from.getTupleTypes(), toTypes = to.getTupleTypes();
        if (fromTypes.length < toTypes.length) return this.typeMismatch(to, from);
        const success = this.wrapChildren(range(toTypes.length), i => {
            return to.getTupleTypes()[i].visit(this, from.getTupleTypes()[i]);
        });
        if (!success) return this.typeMismatch(to, from);
        return true;
    }

    /**
     * Function assignability is more complex than other types.
     * Function return types are covariant (just like most types)
     * because they are 'read' values rather than 'write' values.
     * Function parameters are contravariant because they are
     * 'write' values. This means that the assignability relationship
     * for function parameters is inverted.
     */
    visitFunction(to: TFunction, from: TType): boolean {
        // only functions can be assigned to other functions
        if (!from.isFunction()) return this.typeMismatch(to, from);
        // 'from' needs to have *at most* the same number of params as 'to'
        // because the extra params passed to it won't do anything
        const fromParams = from.getParams(), toParams = to.getParams();
        if (fromParams.length > toParams.length) return this.typeMismatch(to, from);
        // the return types need to be assignable
        if (!to.getReturnType().visit(this, from.getReturnType())) return this.typeMismatch(to, from);
        // the param types need to be assignable (using the reverse relationship as described above)
        const success = this.wrapChildren(range(toParams.length), i => {
            if (i >= fromParams.length) return true;
            return this.fork(from.getParams()[i], to.getParams()[i], this.invertTarget());
        })
        if (!success) return this.typeMismatch(to, from);
        return true;
    }

    visitParam(to: TParam, from: TType): boolean {
        return to.constraint.visit(this, from);
    }

    visitArg(to: TArg, from: TType): boolean {
        if (to.variance === 'covariant') {
            // the type must be assignable to our type
            return to.type.visit(this, from);
        } else if (to.variance === 'contravariant') {
            // our type must be assignable to the type
            return this.fork(from, to.type, this.invertTarget());
        } else {
            // invariant, both must be true
            return to.type.visit(this, from) && this.fork(from, to.type, this.invertTarget());
        }
    }

    visitUnion(to: TUnion, from: TType): boolean {
        // the type just needs to be assignable to one of the types in the union
        for (const tt of to.types) {
            if (tt.visit(this, from)) return true;
        }
        return this.typeMismatch(to, from);
    }

    visitAny(_to: TAny, _from: TType): boolean {
        // all types are assignable to any
        return true;
    }

    visitNever(_to: TNever, _from: TType): boolean {
        // no types are assignable to never
        return false;
    }

    visitRecursive(to: TRecursive, from: TType): boolean {
        return to.decl.type.visit(this, from);
    }

    visitInferred(to: TInferred, from: TType): boolean {
        if (to.type) return to.type.visit(this, from);
        // reaching this point means that we can assign the inferred type
        to.type = from;
        return true;
    }

    visitOverloadedGeneric(type: TOverloadedGeneric): boolean {
        throw new Error("Method not implemented.");
    }

    /**
     * Types that will never be visited for assignment
     */
    visitGeneric(_actual: TGeneric): boolean { throw new Error("Method not implemented."); }
    visitParams(_type: TParams): boolean { throw new Error("Method not implemented."); }
    visitArgs(_type: TArgs): boolean { throw new Error("Method not implemented."); }
    visitNamespace(_type: TNamespace): boolean { throw new Error("Method not implemented."); }
}
