import ParserError from '~/parser/ParserError';
import { INVALID_EXPRESSION } from '~/parser/ParserMessages';
import { Token } from '~/parser/Tokenizer';
import { TType, TInteger, TFloat, TChar, TBool, TArray, TFunction, TAny, TUnknown, determineGeneralType } from '~/typecheck/types';
import Interpreter from '~/interpreter/Interpreter';
import RValue, { RInteger, RFloat, RBool, RArray, RString, RFunction } from './types';
import { FunctionCallRef } from './instructions';


/**
 * Because the < and > characters are used for both operators and type parameters,
 * we need to include logic that is not possible in the tokenizer or parser.
 * Any parser node that uses operator tokens should call this method in reduce()
 * before doing anything else, passing the list of operator tokens.
 */
export function verifyMultiOperator(tokens: Token) {
    // this can happen during testing
    if (!Array.isArray(tokens)) return tokens;
    // single token, just return it
    if (tokens.length === 1) return tokens[0];
    // if there are multiple tokens, throw an error if any of them is not < or >
    if (tokens.some(t => t.image.indexOf('<') === -1 && t.image.indexOf('>') !== -1)) {
        throw new ParserError(INVALID_EXPRESSION, tokens[0].line, tokens[0].column);
    }
    // otherwise just combine them all into one token
    return new Token('OPER', tokens[0].line, tokens[0].column, tokens.map(t => t.image).join(''));
}

type OperatorType = 'prefix' | 'postfix' | 'infix';
type OperatorAssociativity = 'left' | 'right' | 'none';
type OperatorDictionary = {
    [type: string]: {
        [symbol: string]: {
            cls: Class<Operator>,
            precedence?: number,
            associativity?: OperatorAssociativity
        }
    }
};

/**
 * Operator table, for lookups.
 */
const operators: OperatorDictionary = {
    prefix: {},
    postfix: {},
    infix: {},
};

/**
 * Decorator for operator classes to register them into the operator table
 */
export function operator(symbol: string, type: OperatorType, precedence?: number, associativity?: OperatorAssociativity) {
    return (cls: Class<Operator>) => {
        operators[type][symbol] = { cls, precedence, associativity };
    };
}

export function getOperatorMetadata(symbol: string, type: OperatorType) {
    return operators[type][symbol];
}

export function createUnary(symbol: string, type: 'prefix' | 'postfix', operandType: TType): Optional<UnaryOperator> {
    const oper = operators[type][symbol];
    if (oper) {
        const cls = oper.cls as Class<UnaryOperator>;
        return new cls(operandType);
    }
    return null;
}

export function createBinary(symbol: string, type: 'infix', operand1Type: TType, operand2Type: TType): Optional<BinaryOperator> {
    const oper = operators[type][symbol];
    if (oper) {
        const cls = oper.cls as Class<BinaryOperator>;
        return new cls(operand1Type, operand2Type);
    }
    return null;
}

/**
 * Base operator class.
 * All operators must define at least a symbol and type (prefix, postfix, or infix).
 * Infix operators must define a precedence value (0-9, compared to adjacent infix operators to determine order of operations)
 * and an associativity (left, none, or right, determines precedence rules in the event of a tie).
 *
 * Precedence/order of operations
 * ------------------------------
 * Infix operators are weird because they are syntactically ambiguous.
 * They work great when they are alone (1 + 2) but if you introduce multiple
 * infix operators in a row (1 + 2 - 3 / 4) you need to be able to figure out what is meant.
 * That's what precedence rules are for. They determine what the syntax tree looks like
 * in the case of ambiguity.
 *
 * Precedence is decided by two things: precedence level and associativity.
 *
 * Precedence level is a number that specifies how tightly it "binds" to the expressions
 * on either side of itself. A number with a higher precedence level will bind tighter,
 * meaning that in the event of ambiguity, it will get the values directly on either side of it
 * before another operator with lower precedence.
 *
 * For example, take this: (1 + 2 / 3), and say that (+) has a precedence of 1, and (/)
 * has a precedence of 2. Becuase (/) is higher, it has priority in the arrangement, and the
 * expression is equivalent to this: (1 + (2 / 3)). As it is parsed, the syntax tree looks like this:
 *    /
 *  +   3
 * 1 2
 * Once it is adjusted, it looks like this:
 *   +
 * 1   /
 *    2 3
 *
 * Built-in precedence levels:
 * 0: Reserved for assignment operators (left-assoc). NEVER use this for ANYTHING but an assignment operator.
 * 1: $ (right-assoc, function-level operations)
 * 2: || (right-assoc, boolean-level operations)
 * 3: && (right-assoc, AND has its own level so it can be chained with OR without parentheses in common cases)
 * 4: comparison/equality operators (no-assoc)
 * 5: + and - (left-assoc, addition-like operators)
 * 6: * and / and % (left-assoc, multiplication-like operators)
 * 7: & and | and ^ (left-assoc, bitwise operators)
 * 8: reserved for user-defined operators
 * 9: reserved for user-defined operators
 *
 * As a note for choosing precedence levels:
 * - lower precedence levels are for larger, sweeping operations, the final stage of an expression
 * - higher precedence levels are for smaller operations that should be done first
 * - prefer 8 and 9 for new kinds of operations
 * - use <8 for operations that are similar to built-ins
 * - when in doubt, use 9
 * - parentheses are always there to guarantee precedence
 *
 * Associativity is a property that specifies how the tree should be arranged in the instance that
 * two adjacent operators have the same precedence. Associativity is either 'left', 'right', or 'none'.
 * Left associative is default, meaning that the tree will choose to weigh more heavily on the left.
 * Right is the opposite. No associativity means that associativity doesn't make sense for the
 * operator, and when it is adjacent to an operator with the same precedence, it will likely come out
 * as a type check error.
 *
 * An example of left-associativity: (1 + 2 - 3). Left associativity is how the expression is parsed
 * by default, so in this instance, the tree will not have to be modified:
 *    -
 *  +   3
 * 1 2
 *
 * An example of right-associativity: (true && false && true). The expression is parsed like this:
 *        &&
 *     &&    true
 * true  false
 * but it needs to be corrected to this:
 *     &&
 * true   &&
 *   false  true
 *
 * An example of no associativity: (1 == 2 == true). The equality operator takes two values of potentially
 * any type and always returns a boolean value. It doesn't make sense for this operator to be chained in this way,
 * but this is technically valid syntax and will type check correctly. This operation will parse as left-associative
 * by default, and it will stay that way unless another adjacent operator decides to change the tree. No associativity
 * effectively means that it will bend to the will of whatever other operators want to do.
 *
 * Now, how does this work when you mix associativities? Well, it turns out you can't. If you put a string of
 * two same-precedence operators with different associativities, both are going to try to wrench the tree
 * the other way, and there is no way to resolve that. This results in a type error.
 * However, if you mix an associative operator with a non-associative operator, the non-associative operator
 * will be compelled to have the same associativity as the associative one.
 *
 * So here's the process. The parser parses with left-associativity by default, so that's what the tree looks like.
 * When resolving precedence, you start with the top operator, which will be the right-most one.
 * If there is no operator immediately on the left or right side, then precedence is resolved already.
 * Otherwise, check the right FIRST.
 * If there is an operator on the right, compare the precedence levels.
 * If the precedence is less, then the tree needs to be shifted so that the lower one is higher in the tree.
 * If the precedence is higher, then the tree is already good.
 * If the precedence is the same, compare associativities.
 * If they have left and right, it's an error and return immediately.
 * If either is none, default to the other, with left as default.
 * If they resolve to left, the tree needs to be shifted so the one on the right is higher.
 * If they resolve to right, the tree can be left alone.
 * The tree is being resolved from right to left, so it can be guaranteed that the right is always correct, and the algorithm should move on to the left node.
 * If there is an operator on the left, compare the precedence levels.
 * If the precedence is less, then the tree needs to be shifted so that the lower one is higher in the tree.
 * If the precedence is higher, then the tree is already good.
 * If the precedence is the same, compare associativities.
 * If they have left and right, it's an error and return immediately.
 * If either is none, default to the other, with left as default.
 * If they resolve to left, leave the tree alone.
 * If they resolve to right, shift the tree so that the on on the left is higher.
 * If the tree needed to be shifted, transfer to the new parent and start over (the right side will process as correct in every case).
 * If not, shift to the left node and start over.
 */
export abstract class Operator {
    functionType: TType;
}

export abstract class UnaryOperator extends Operator {
    constructor(operand: TType) {
        super();
        this.functionType = this.resolveType(operand);
    }

    protected abstract resolveType(operand: TType): TType;
    abstract execute(interpreter: Interpreter, targetRef: number, ref: number): void;
}

export abstract class BinaryOperator extends Operator {
    constructor(operand1: TType, operand2: TType) {
        super();
        this.functionType = this.resolveType(operand1, operand2);
    }

    protected abstract resolveType(left: TType, right: TType): TType;
    abstract execute(interpreter: Interpreter, targetRef: number, ref1: number, ref2: number): void;
}

// /////////////////////////////////
// OPERATOR TYPE HELPER FUNCTIONS //
// /////////////////////////////////

/**
 * Get the type of a unary operator that only operates on numbers
 */
function getNumericUnaryOperatorType(operand: TType) {
    // operator only works on numeric types
    if (!(operand instanceof TInteger || operand instanceof TFloat)) return new TUnknown();
    // operator returns the same type that it receives
    return new TFunction([operand], operand);
}

/**
 * Given a size of an unsigned integer type, return the size of the type
 * if it were converted to a legal signed type.
 */
function getSignedUpgradeSize(size: number) {
    return size === 64 ? 64 : (2 * size);
}

/**
 * In the case of unary + and -, these operators force the value to be a signed value (for parity).
 * If the type is already signed, it is kept the same.
 * If not, it needs to be made signed. Making an integer type signed reduces the max value of the type,
 * so to prevent overflows in this case, the type is upgraded to the next highest size.
 * If the type is a 64-bit integer, it is kept the same, so overflow will still be possible in that case.
 * Even though we have an unfixed-width integer type, we don't ever want to implicitly convert
 * between fixed-width types and this type, because the extra complexity of the type leads
 * to slightly lower performance, and we want developers to control this behavior.
 */
function getSignedNumericUnaryOperatorType(operand: TType) {
    const type = getNumericUnaryOperatorType(operand);
    if (type instanceof TUnknown || operand instanceof TFloat) return type;
    const returnType = type.returnType as TInteger;
    if (!returnType.signed) {
        type.returnType = new TInteger(getSignedUpgradeSize(returnType.size), true);
    }
    return type;
}

/**
 * There are a whole mess of combinations of numeric types that can be used in a binary operator, and we have to handle them all.
 * Ultimately, the goal is to pick a return type that allows values of both of the component types, as much as possible.
 * Float values are less precise, so if they factor into the operation at all, the result will be a float.
 * Float/Float -> bigger type
 * UInt/UInt -> bigger type
 * SInt/SInt -> bigger type
 * UInt/SInt (bigger SInt) -> SInt
 * UInt/SInt (bigger UInt) -> signed upgrade of UInt
 * Int/Float -> Float
 */
function getNumericBinaryOperatorType(operand1: TType, operand2: TType) {
    // operator only works on numeric types
    if (!(operand1 instanceof TInteger || operand1 instanceof TFloat) || !(operand2 instanceof TInteger || operand2 instanceof TFloat)) return new TUnknown();
    if (operand1 instanceof TFloat && operand2 instanceof TFloat) {
        // both floats, return the larger one
        return new TFunction([operand1, operand2], new TFloat(Math.max(operand1.size, operand2.size)));
    } else if (operand1 instanceof TInteger && operand2 instanceof TInteger) {
        // both ints, signed has higher precedence, try to get size that allows for both
        if (operand1.signed === operand2.signed) {
            // both have same signed value, return the larger one
            return new TFunction([operand1, operand2], new TInteger(Math.max(operand1.size, operand2.size), operand1.signed));
        } else {
            // only one is signed, if signed is bigger use signed type, otherwise use signed upgrade of the unsigned type
            const [signed, unsigned] = operand1.signed ? [operand1, operand2] : [operand2, operand1];
            if (signed.size > unsigned.size) return new TFunction([operand1, operand2], signed);
            else return new TFunction([operand1, operand2], new TInteger(getSignedUpgradeSize(unsigned.size), true));
        }
    } else {
        // one is int, other is float, use float type
        const float = (operand1 instanceof TInteger) ? operand2 : operand1;
        return new TFunction([operand1, operand2], float);
    }
}

/**
 * Determine the type of a bitwise binary operator from the operand types.
 * The types must be unsigned integers.
 */
function getBitwiseBinaryOperatorType(operand1: TType, operand2: TType) {
    // operands need to be unsigned integers of the same size
    if (!(operand1 instanceof TInteger && !operand1.signed) || !(operand2 instanceof TInteger && !operand2.signed) || operand1.size !== operand2.size) return new TUnknown();
    return new TFunction([operand1, operand2], operand1);
}

/**
 * Determine the type of a boolean binary operator from the operand types.
 * The types must be booleans.
 */
function getBooleanBinaryOperatorType(operand1: TType, operand2: TType) {
    if (operand1 instanceof TBool && operand2 instanceof TBool) return new TFunction([operand1, operand2], operand1);
    return new TUnknown();
}

/**
 * Determine the type of a comparison operator from the operand types.
 * The types must either both be numbers, or both characters.
 */
function getComparisonOperatorType(operand1: TType, operand2: TType) {
    // numbers can be compared to numbers
    if ((operand1 instanceof TInteger || operand1 instanceof TFloat) && (operand2 instanceof TInteger || operand2 instanceof TFloat)) {
        return new TFunction([operand1, operand2], new TBool());
    }
    // chars can be compared to chars
    if (operand1 instanceof TChar && operand2 instanceof TChar) {
        return new TFunction([operand1, operand2], new TBool());
    }
    return new TUnknown();
}

/**
 * Determine the type of an equality operator.
 * The types must have a type relationship (one is assignable to the other).
 */
function getEqualityOperatorType(operand1: TType, operand2: TType) {
    // two values can be compared for equality as long as they have some type relationship
    const generic = determineGeneralType(operand1, operand2);
    if (generic instanceof TAny) return new TUnknown();
    return new TFunction([operand1, operand2], new TBool());
}

/**
 * Given the type of a numeric operator,
 * return the runtime type constructor associated with the return type of the operator.
 */
function getNumericRuntimeType(functionType: TFunction): Class<RValue<number>> {
    if (functionType.returnType instanceof TInteger) return RInteger;
    return RFloat;
}

// ///////////////////
// PREFIX OPERATORS //
// ///////////////////

/**
 * This operator is meant to be the opposite of -, which flips the sign of a number.
 * The opposite of flipping the sign of a number is... not flipping the sign of a number.
 * So semantically, this operator does nothing.
 * It will, however, convert an unsigned type to a signed type, which has consequences described above.
 * (see getSignedNumericUnaryOperatorType())
 */
@operator('+', 'prefix')
export class UnaryPlusOperator extends UnaryOperator {
    resolveType(operand: TType) {
        return getSignedNumericUnaryOperatorType(operand);
    }

    execute(interp: Interpreter, targetRef: number, ref: number) {
        interp.references[targetRef] = interp.operateOnRef<number, number>(ref, v => v, getNumericRuntimeType(this.functionType as TFunction));
    }
}

/**
 * This operator flips the sign of a number, also converting it to a signed type in the process.
 */
@operator('-', 'prefix')
export class UnaryMinusOperator extends UnaryOperator {
    resolveType(operand: TType) {
        return getSignedNumericUnaryOperatorType(operand);
    }

    execute(interp: Interpreter, targetRef: number, ref: number) {
        interp.references[targetRef] = interp.operateOnRef<number, number>(ref, v => -v, getNumericRuntimeType(this.functionType as TFunction));
    }
}

/**
 * This operator flips a boolean value from true to false, or vice versa.
 */
@operator('!', 'prefix')
export class NotOperator extends UnaryOperator {
    resolveType(operand: TType) {
        if (!(operand instanceof TBool)) return new TUnknown();
        return new TFunction([operand], operand);
    }

    execute(interp: Interpreter, targetRef: number, ref: number) {
        interp.references[targetRef] = interp.operateOnRef<boolean, boolean>(ref, v => !v, RBool);
    }
}

/**
 * This operator takes any unsigned integer value, and flips all the bits inside it.
 */
@operator('~', 'prefix')
export class BitwiseNotOperator extends UnaryOperator {
    resolveType(operand: TType) {
        // operand needs to be an unsigned integer
        if (!(operand instanceof TInteger && !operand.signed)) return new TUnknown();
        return new TFunction([operand], operand);
    }

    execute(interp: Interpreter, targetRef: number, ref: number) {
        interp.references[targetRef] = interp.operateOnRef<number, number>(ref, v => ~v, RInteger);
    }
}

/**
 * This operator increments a numeric value, returning the incremented value.
 * This operator is in the class of assignment operators, which have a special behavior not possible directly in the language.
 * Instead of operating on the value of an expression, it operates on a reference to the expression.
 */
@operator('++', 'prefix')
export class PrefixIncrementOperator extends UnaryOperator {
    resolveType(operand: TType) {
        return getNumericUnaryOperatorType(operand);
    }

    execute(interp: Interpreter, targetRef: number, ref: number) {
        interp.references[targetRef] = interp.operateOnRef<number, number>(ref, v => (v + 1), getNumericRuntimeType(this.functionType as TFunction));
    }
}

/**
 * This operator decrements a numeric value, returning the decremented value.
 * This operator is in the class of assignment operators, which have a special behavior not possible directly in the language.
 * Instead of operating on the value of an expression, it operates on a reference to the expression.
 */
@operator('--', 'prefix')
export class PrefixDecrementOperator extends UnaryOperator {
    resolveType(operand: TType) {
        return getNumericUnaryOperatorType(operand);
    }

    execute(interp: Interpreter, targetRef: number, ref: number) {
        interp.references[targetRef] = interp.operateOnRef<number, number>(ref, v => (v + 1), getNumericRuntimeType(this.functionType as TFunction));
    }
}

// ////////////////////
// POSTFIX OPERATORS //
// ////////////////////

/**
 * This operator increments a numeric value, returning the value from before the increment.
 * This operator is in the class of assignment operators, which have a special behavior not possible directly in the language.
 * Instead of operating on the value of an expression, it operates on a reference to the expression.
 */
@operator('++', 'postfix')
export class PostfixIncrementOperator extends UnaryOperator {
    resolveType(operand: TType) {
        return getNumericUnaryOperatorType(operand);
    }

    execute(interp: Interpreter, targetRef: number, ref: number) {
        const type = getNumericRuntimeType(this.functionType as TFunction);
        const val = interp.references[ref];
        const retVal = val.value as number;
        (interp.references[ref].value as number)++;
        interp.references[targetRef] = new type(retVal);
    }
}

/**
 * This operator decrements a numeric value, returning the value from before the decrement.
 * This operator is in the class of assignment operators, which have a special behavior not possible directly in the language.
 * Instead of operating on the value of an expression, it operates on a reference to the expression.
 */
@operator('--', 'postfix')
export class PostfixDecrementOperator extends UnaryOperator {
    resolveType(operand: TType) {
        return getNumericUnaryOperatorType(operand);
    }

    execute(interp: Interpreter, targetRef: number, ref: number) {
        const type = getNumericRuntimeType(this.functionType as TFunction);
        const val = interp.references[ref];
        const retVal = val.value as number;
        (interp.references[ref].value as number)--;
        interp.references[targetRef] = new type(retVal);
    }
}

// //////////////////
// INFIX OPERATORS //
// //////////////////

/**
 * This operator serves to concatenate two arrays, or add two numeric values together.
 * This will only register as a concatenation operator if there is a relationship between the two types.
 * If the generic type of the two is Any, the operator is not valid.
 */
@operator('+', 'infix', 5, 'left')
export class PlusOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        if (operand1 instanceof TArray && operand2 instanceof TArray) {
            const generic = determineGeneralType(operand1.baseType, operand2.baseType);
            if (!(generic instanceof TAny)) {
                // array concatenation, as long as the two types have some relationship
                return new TFunction([operand1, operand2], new TArray(generic));
            }
        }
        // otherwise assume it is a numeric operation
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        const returnType = (this.functionType as TFunction).returnType;
        if (returnType instanceof TArray) {
            const left = interp.references[leftRef];
            const right = interp.references[rightRef];
            if (left instanceof RString) {
                // string concatenation, different implementation than array concatenation in JS
                interp.references[targetRef] = left.concat(right as RString);
            }
            // array concatenation
            interp.references[targetRef] = (left as RArray).concat(right as RArray);
        }
        const type = getNumericRuntimeType(this.functionType as TFunction);
        interp.references[targetRef] = interp.operateOnRefs<number, number, number>(leftRef, rightRef, (v1, v2) => v1 + v2, type);
    }
}

/**
 * Subtracts two numbers.
 */
@operator('-', 'infix', 5, 'left')
export class MinusOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        const type = getNumericRuntimeType(this.functionType as TFunction);
        interp.references[targetRef] = interp.operateOnRefs<number, number, number>(leftRef, rightRef, (v1, v2) => v1 - v2, type);
    }
}

/**
 * Multiplies two numbers.
 */
@operator('*', 'infix', 6, 'left')
export class MultiplyOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        const type = getNumericRuntimeType(this.functionType as TFunction);
        interp.references[targetRef] = interp.operateOnRefs<number, number, number>(leftRef, rightRef, (v1, v2) => v1 * v2, type);
    }
}

/**
 * Divides two numbers.
 * Division is tricky because two integers dividing can logically result in a fractional number.
 * However, in the world of computers, this is not as cut and dry.
 * Traditionally, integer division will always return the truncated result of the division
 * so that the result will always be an integer.
 * The modulo operator complements this behavior.
 * Thus, this operator follows the same rules as the others.
 * If both are integers, the result will be an integer.
 * If one is a float, the result will be a float.
 */
@operator('/', 'infix', 6, 'left')
export class DivideOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        const type = getNumericRuntimeType(this.functionType as TFunction);
        interp.references[targetRef] = interp.operateOnRefs<number, number, number>(leftRef, rightRef, (v1, v2) => v1 / v2, type);
    }
}

/**
 * Returns the remainder result of dividing two numbers.
 * This complements integer division, allowing operations on potentially
 * fractional numbers without having to worry about the lack of precision
 * of floating point numbers.
 */
@operator('%', 'infix', 6, 'left')
export class ModuloOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        const type = getNumericRuntimeType(this.functionType as TFunction);
        interp.references[targetRef] = interp.operateOnRefs<number, number, number>(leftRef, rightRef, (v1, v2) => v1 % v2, type);
    }
}

/**
 * Performs bitwise AND operations for each pair of bits of two unsigned integer types of the same size
 */
@operator('&', 'infix', 7, 'left')
export class BitwiseAndOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getBitwiseBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.operateOnRefs<number, number, number>(leftRef, rightRef, (v1, v2) => v1 & v2, RInteger);
    }
}

/**
 * Performs bitwise OR operations for each pair of bits of two unsigned integer types of the same size
 */
@operator('|', 'infix', 7, 'left')
export class BitwiseOrOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getBitwiseBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.operateOnRefs<number, number, number>(leftRef, rightRef, (v1, v2) => v1 | v2, RInteger);
    }
}

/**
 * Performs a boolean AND operation on two boolean values
 */
@operator('&&', 'infix', 3, 'right')
export class AndOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getBooleanBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.operateOnRefs<boolean, boolean, boolean>(leftRef, rightRef, (v1, v2) => v1 && v2, RBool);
    }
}

/**
 * Performs a boolean OR operation on two boolean values
 */
@operator('||', 'infix', 2, 'right')
export class OrOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getBooleanBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.operateOnRefs<boolean, boolean, boolean>(leftRef, rightRef, (v1, v2) => v1 || v2, RBool);
    }
}

/**
 * Performs bitwise XOR operations for each pair of bits of two unsigned integer types of the same size,
 * OR performs a boolean XOR for two boolean values
 */
@operator('^', 'infix', 7, 'left')
export class XorOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        const t = getBooleanBinaryOperatorType(operand1, operand2);
        if (t instanceof TUnknown) return getBitwiseBinaryOperatorType(operand1, operand2);
        return t;
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        const functionType = this.functionType as TFunction;
        if (functionType.returnType instanceof TBool) {
            // !== is equivalent to ^ for booleans
            interp.references[targetRef] = interp.operateOnRefs<boolean, boolean, boolean>(leftRef, rightRef, (v1, v2) => v1 !== v2, RBool);
        }
        const type = getNumericRuntimeType(this.functionType as TFunction);
        interp.references[targetRef] = interp.operateOnRefs<number, number, number>(leftRef, rightRef, (v1, v2) => v1 ^ v2, type);
    }
}

/**
 * Assignment form of plus operator, adds a value to a reference to an expression.
 */
@operator('+=', 'infix', 0, 'left')
export class PlusAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        if (operand1 instanceof TArray && operand2 instanceof TArray) {
            const generic = determineGeneralType(operand1.baseType, operand2.baseType);
            if (!(generic instanceof TAny)) {
                // array concatenation, as long as the two types have some relationship
                return new TFunction([operand1, operand2], new TArray(generic as TType));
            }
        }
        // otherwise assume it is a numeric operation
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        let newVal: RValue<number | string> | RArray;
        const returnType = (this.functionType as TFunction).returnType;
        if (returnType instanceof TArray) {
            const left = interp.references[leftRef];
            const right = interp.references[rightRef];
            if (left instanceof RString) {
                // string concatenation, different implementation than array concatenation in JS
                newVal = left.concat(right as RString);
            } else {
                // array concatenation
                newVal = (left as RArray).concat(right as RArray);
            }
        } else {
            const type = getNumericRuntimeType(this.functionType as TFunction);
            newVal = interp.operateOnRefs<number, number, number>(leftRef, rightRef, (v1, v2) => v1 + v2, type);
        }
        interp.references[targetRef] = interp.references[leftRef] = newVal;
    }
}

/**
 * Assignment form of minus operator, subtracts a value from a reference to an expression.
 */
@operator('-=', 'infix', 0, 'left')
export class MinusAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.assignment<number, number>(leftRef, rightRef, (v1, v2) => v1 - v2);
    }
}

/**
 * Assignment form of multiply operator, multiplies a reference to an expression.
 */
@operator('*=', 'infix', 0, 'left')
export class MultiplyAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.assignment<number, number>(leftRef, rightRef, (v1, v2) => v1 * v2);
    }
}

/**
 * Assignment form of divide operator, divides a reference to an expression.
 */
@operator('/=', 'infix', 0, 'left')
export class DivideAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.assignment<number, number>(leftRef, rightRef, (v1, v2) => v1 / v2);
    }
}

/**
 * Assignment form of modulo operator, performs a modulo on a reference to an expression and stores the result back into the reference.
 */
@operator('%=', 'infix', 0, 'left')
export class ModuloAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getNumericBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.assignment<number, number>(leftRef, rightRef, (v1, v2) => v1 % v2);
    }
}

/**
 * Assignment form of bitwise AND operator, performs a bitwise AND on a reference to an expression and stores the result back into the reference.
 */
@operator('&=', 'infix', 0, 'left')
export class BitwiseAndAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getBitwiseBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.assignment<number, number>(leftRef, rightRef, (v1, v2) => v1 & v2);
    }
}

/**
 * Assignment form of bitwise OR operator, performs a bitwise OR on a reference to an expression and stores the result back into the reference.
 */
@operator('|=', 'infix', 0, 'left')
export class BitwiseOrAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getBitwiseBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.assignment<number, number>(leftRef, rightRef, (v1, v2) => v1 | v2);
    }
}

/**
 * Assignment form of boolean AND operator, performs a boolean AND on a reference to an expression and stores the result back into the reference.
 */
@operator('&&=', 'infix', 0, 'left')
export class AndAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getBooleanBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.assignment<boolean, boolean>(leftRef, rightRef, (v1, v2) => v1 && v2);
    }
}

/**
 * Assignment form of boolean OR operator, performs a boolean OR on a reference to an expression and stores the result back into the reference.
 */
@operator('||=', 'infix', 0, 'left')
export class OrAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getBooleanBinaryOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.assignment<boolean, boolean>(leftRef, rightRef, (v1, v2) => v1 || v2);
    }
}

/**
 * Assignment form of XOR operator, performs a XOR on a reference to an expression and stores the result back into the reference.
 */
@operator('^=', 'infix', 0, 'left')
export class XorAssignmentOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        const t = getBooleanBinaryOperatorType(operand1, operand2);
        if (t instanceof TUnknown) return getBitwiseBinaryOperatorType(operand1, operand2);
        return t;
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        const functionType = this.functionType as TFunction;
        if (functionType.returnType instanceof TBool) {
            // !== is equivalent to ^ for booleans
            interp.references[targetRef] = interp.assignment<boolean, boolean>(leftRef, rightRef, (v1, v2) => v1 !== v2);
        }
        interp.references[targetRef] = interp.assignment<number, number>(leftRef, rightRef, (v1, v2) => v1 ^ v2);
    }
}

/**
 * Compares two ordered values and returns true if the left is less than the right.
 */
@operator('<', 'infix', 4, 'none')
export class LessThanOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getComparisonOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.operateOnRefs<number, number, boolean>(leftRef, rightRef, (v1, v2) => v1 < v2, RBool);
    }
}

/**
 * Compares two ordered values and returns true if the left is greater than the right.
 */
@operator('>', 'infix', 4, 'none')
export class GreaterThanOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getComparisonOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.operateOnRefs<number, number, boolean>(leftRef, rightRef, (v1, v2) => v1 > v2, RBool);
    }
}

/**
 * Compares two ordered values and returns true if the left is less than or equal to the right.
 */
@operator('<=', 'infix', 4, 'none')
export class LessThanOrEqualToOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getComparisonOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.operateOnRefs<number, number, boolean>(leftRef, rightRef, (v1, v2) => v1 <= v2, RBool);
    }
}

/**
 * Compares two ordered values and returns true if the left is greater than or equal to the right.
 */
@operator('>=', 'infix', 4, 'none')
export class GreaterThanOrEqualToOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getComparisonOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        interp.references[targetRef] = interp.operateOnRefs<number, number, boolean>(leftRef, rightRef, (v1, v2) => v1 >= v2, RBool);
    }
}

/**
 * Compares two values of comparable types and returns true if they represent the same value
 */
@operator('==', 'infix', 4, 'none')
export class EqualsOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getEqualityOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        const left = interp.references[leftRef];
        const right = interp.references[rightRef];
        interp.references[targetRef] = new RBool(left.equals(right));
    }
}

/**
 * Compares two values of comparable types and returns true if they do not represent the same value
 */
@operator('!=', 'infix', 4, 'none')
export class NotEqualOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        return getEqualityOperatorType(operand1, operand2);
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        const left = interp.references[leftRef];
        const right = interp.references[rightRef];
        interp.references[targetRef] = new RBool(!left.equals(right));
    }
}

/**
 * Takes a function and a value and applies the value as the first argument to the function.
 * If the function only has one parameter, the return value is the return value of the function.
 * Otherwise, the return value is a new function with the remaining parameters of the function.
 * This operator can be repeatedly applied to invoke a function with a different syntax.
 * It can also be used to partially apply a function.
 */
@operator('$', 'infix', 1, 'right')
export class ApplyOperator extends BinaryOperator {
    resolveType(operand1: TType, operand2: TType) {
        // first operand needs to be a function
        if (!(operand1 instanceof TFunction)) return new TUnknown();
        const paramType = operand1.paramTypes[0];
        // the function needs to have at least one parameter, and the second operand needs to be assignable to that parameter
        if (!paramType || !paramType.isAssignableFrom(operand2)) return new TUnknown();
        if (operand1.paramTypes.length === 1) {
            // if that was the only parameter, this operator will simply invoke the function and return the return type
            return new TFunction([operand1, operand2], operand1.returnType);
        } else {
            // otherwise, we need to cut off the first parameter
            const params = [...operand1.paramTypes];
            params.shift();
            // and the operator will return a new function with the remaining parameters
            return new TFunction([operand1, operand2], new TFunction(params, operand1.returnType));
        }
    }

    execute(interp: Interpreter, targetRef: number, leftRef: number, rightRef: number) {
        if (this.functionType.getParams().length === 1) {
            // function only has one parameter left, use the normal function call instruction
            new FunctionCallRef(leftRef, targetRef, [rightRef]).execute(interp);
        } else {
            // create a new function reference, adding the argument to the end of the list
            const func = interp.references[leftRef] as RFunction;
            interp.references[targetRef] = new RFunction(func.functionId, ...[...func.argRefs, rightRef]);
        }
    }
}
