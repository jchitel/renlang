import RValue, { RArray, RBool, RChar, RFloat, RInteger, RString, RStruct, RTuple, RFunction } from './types';
import { UnaryOperator, BinaryOperator } from './operators';
import { FunctionFrame, ScopeFrame, LoopFrame, TryFrame, Catch, Finally } from '../interpreter/frames';
import Interpreter from '../interpreter/Interpreter';


/**
 * Represents an IR instruction for the JS implementation of the Ren interpreter.
 * There are 4 types of instructions:
 * 1. Reference instructions: actual logical instructions that store resulting values into references
 * 2. Scope instructions: instructions responsible for managing the scope stack and creating variables
 * 3. Branch/jump instructions: instructions that change the instruction counter
 * 4. Misc instructions: instructions that have special behavior that doesn't fit into the above categories
 */
export default abstract class Instruction {
    abstract execute(interp: Interpreter): void;
}

// ////////////////////
// MISC INSTRUCTIONS //
// ////////////////////

/**
 * An instruction that does nothing, useful for jump targets
 */
export class Noop extends Instruction {
    execute() {}
}

/**
 * An instruction that returns from the function
 * and exposes the return value as the resulting reference
 * of the expression where the function was called.
 */
export class Return extends Instruction {
    ref: number;

    constructor(ref: number) {
        super();
        this.ref = ref;
    }

    execute(interp: Interpreter) {
        // set return value
        interp.returnValue = interp.references[this.ref];
        // pop off all frames until the function frame
        while (!(interp.stack[interp.stack.length - 1] instanceof FunctionFrame)) {
            const frame = interp.stack[interp.stack.length - 1];
            if (frame instanceof TryFrame) {
                frame.executeFinally(interp);
            }
            interp.stack.pop();
        }
        // set the ic to the last instruction
        interp.ic = interp.functions[interp.func].instructions.length - 1;
    }
}

/**
 * An instruction that takes a reference to an exception and switches to an error context
 * where all frames are popped off until:
 * a) we reach the top level of the function, in which case we pop off the function frame and repeat at the caller
 * b) we reach a try frame, in which case a matching catch type will switch back to normal context in the catch block
 * c) if no try frames match the exception type, we will eventually reach the top level of the program, where the error is exposed to stderr.
 */
export class Throw extends Instruction {
    ref: number;

    constructor(ref: number) {
        super();
        this.ref = ref;
    }

    execute(interp: Interpreter) {
        // set the error
        interp.error = interp.references[this.ref];
        // move to error context, interpreter will handle the rest
        interp.errorContext = true;
    }
}

/**
 * An instruction that has a "loopNumber" n, where n loop frames will be popped
 * and we pick up after the outside of the resulting loop.
 */
export class Break extends Instruction {
    loopNumber: number;

    constructor(loopNumber: number) {
        super();
        this.loopNumber = loopNumber;
    }

    execute(interp: Interpreter) {
        // pop all frames until the first loop frame
        while (!(interp.stack[interp.stack.length - 1] instanceof LoopFrame)) {
            interp.stack.pop();
        }
        // pop n loop frames until n == loopNumber
        let loops = 0;
        while (true) {
            if (interp.stack[interp.stack.length - 1] instanceof LoopFrame) {
                if (loops === this.loopNumber) break;
                else ++loops;
            }
            interp.stack.pop();
        }
        // jump to end of loop
        interp.ic = (interp.stack[interp.stack.length - 1] as LoopFrame).end;
    }
}

/**
 * An instruction that has a "loopNumber" n, where n loop frames will be popped
 * and we pick up at the next iteration of the resulting loop.
 */
export class Continue extends Instruction {
    loopNumber: number;

    constructor(loopNumber: number) {
        super();
        this.loopNumber = loopNumber;
    }

    execute(interp: Interpreter) {
        // pop all frames until the first loop frame
        while (!(interp.stack[interp.stack.length - 1] instanceof LoopFrame)) {
            interp.stack.pop();
        }
        // pop n loop frames until n == loopNumber
        let loops = 0;
        while (true) {
            if (interp.stack[interp.stack.length - 1] instanceof LoopFrame) {
                if (loops === this.loopNumber) break;
                else ++loops;
            }
            interp.stack.pop();
        }
        // jump to start of loop
        interp.ic = (interp.stack[interp.stack.length - 1] as LoopFrame).start;
    }
}

/**
 * Sets the value of a constant to the value of a reference.
 */
export class ConstSet extends Instruction {
    constRef: number;
    ref: number;

    constructor(constRef: number, ref: number) {
        super();
        this.constRef = constRef;
        this.ref = ref;
    }

    execute(interp: Interpreter) {
        interp.constants[this.constRef] = interp.references[this.ref].value;
    }
}

// /////////////////////////
// REFERENCE INSTRUCTIONS //
// /////////////////////////

/**
 * Sets the value of a reference to an integer value
 */
export class SetIntegerRef extends Instruction {
    ref: number;
    value: number;

    constructor(ref: number, value: number) {
        super();
        this.ref = ref;
        this.value = value;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = new RInteger(this.value);
    }
}

/**
 * Sets the value of a reference to a float value
 */
export class SetFloatRef extends Instruction {
    ref: number;
    value: number;

    constructor(ref: number, value: number) {
        super();
        this.ref = ref;
        this.value = value;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = new RFloat(this.value);
    }
}

/**
 * Sets the value of a reference to a char value
 */
export class SetCharRef extends Instruction {
    ref: number;
    value: string;

    constructor(ref: number, value: string) {
        super();
        this.ref = ref;
        this.value = value;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = new RChar(this.value);
    }
}

/**
 * Sets the value of a reference to a bool value
 */
export class SetBoolRef extends Instruction {
    ref: number;
    value: boolean;

    constructor(ref: number, value: boolean) {
        super();
        this.ref = ref;
        this.value = value;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = new RBool(this.value);
    }
}

/**
 * Sets the value of a reference to a string value
 */
export class SetStringRef extends Instruction {
    ref: number;
    value: string;

    constructor(ref: number, value: string) {
        super();
        this.ref = ref;
        this.value = value;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = new RString(this.value);
    }
}

/**
 * Sets the value of a reference to a tuple value,
 * where each of the value refs is a reference to each item in the tuple.
 */
export class SetTupleRef extends Instruction {
    ref: number;
    refs: number[];

    constructor(ref: number, refs: number[]) {
        super();
        this.ref = ref;
        this.refs = refs;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = new RTuple(this.refs);
    }
}

/**
 * Sets the value of a reference to an array value,
 * where each of the value refs is a reference to each item in the array.
 */
export class SetArrayRef extends Instruction {
    ref: number;
    value: number[] | string;

    constructor(ref: number, value: number[] | string) {
        super();
        this.ref = ref;
        this.value = value;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = (typeof this.value === 'string') ? new RString(this.value) : new RArray(this.value);
    }
}

/**
 * Sets the value of a reference to a struct value,
 * where each of the value refs is a reference to each value in the struct, keyed by field name.
 */
export class SetStructRef extends Instruction {
    ref: number;
    refs: { [field: string]: number };

    constructor(ref: number, refs: { [field: string]: number }) {
        super();
        this.ref = ref;
        this.refs = refs;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = new RStruct(this.refs);
    }
}

export class SetFunctionRef extends Instruction {
    ref: number;
    functionId: number;

    constructor(ref: number, functionId: number) {
        super();
        this.ref = ref;
        this.functionId = functionId;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = new RFunction(this.functionId);
    }
}

/**
 * Sets the value of a reference to the value of the function parameter at the specified index.
 */
export class ParamRef extends Instruction {
    index: number;
    ref: number;    

    constructor(index: number, ref: number) {
        super();
        this.index = index;
        this.ref = ref;
    }

    execute(interp: Interpreter) {
        const frame = interp.stack[interp.funcFrame] as FunctionFrame;
        interp.references[this.ref] = frame.args[this.index];
    }
}

/**
 * Sets the value of a reference to the current error value, which is only available when leaving an error context,
 * which happens when an exception reaches a try-catch with a matching type.
 */
export class ErrorRef extends Instruction {
    ref: number;
    
    constructor(ref: number) {
        super();
        this.ref = ref;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = interp.error;
    }
}

/**
 * Sets the value of a reference to the result of a unary operator expression,
 * where targetRef is a reference to the value of the target expression.
 */
export class UnaryOperatorRef extends Instruction {
    ref: number;
    operator: UnaryOperator;
    targetRef: number;
    
    constructor(ref: number, operator: UnaryOperator, targetRef: number) {
        super();
        this.ref = ref;
        this.operator = operator;
        this.targetRef = targetRef;
    }

    execute(interp: Interpreter) {
        this.operator.execute(interp, this.ref, this.targetRef);
    }
}

/**
 * Sets the value of a reference to the result of a binary operator expression,
 * where leftRef and rightRef are references to the values of the left and right target expressions.
 */
export class BinaryOperatorRef extends Instruction {
    ref: number;
    leftRef: number;
    operator: BinaryOperator;
    rightRef: number;
    
    constructor(ref: number, leftRef: number, operator: BinaryOperator, rightRef: number) {
        super();
        this.ref = ref;
        this.leftRef = leftRef;
        this.operator = operator;
        this.rightRef = rightRef;
    }

    execute(interp: Interpreter) {
        this.operator.execute(interp, this.ref, this.leftRef, this.rightRef);
    }
}

/**
 * Sets the value of a reference to the result of a function call,
 * where targetRef is a reference to the function being called,
 * and the paramRefs are references to the values of the parameters.
 */
export class FunctionCallRef extends Instruction {
    ref: number;
    targetRef: number;
    paramRefs: number[];
    
    constructor(ref: number, targetRef: number, paramRefs: number[]) {
        super();
        this.ref = ref;
        this.targetRef = targetRef;
        this.paramRefs = paramRefs;
    }

    execute(interp: Interpreter) {
        // get function id from references
        const func = interp.references[this.targetRef] as RFunction;
        // get parameter values, pull arg refs from function reference first
        const params = [...func.argRefs, ...this.paramRefs].map(p => interp.references[p]);
        // create new function frame with return info
        const funcFrame = new FunctionFrame({
            func: func.functionId,
            args: params,
            returnRef: this.ref,
            callerId: interp.func,
            callerFuncFrame: interp.funcFrame,
            returnIc: interp.ic
        });
        // push the frame on the stack
        interp.stack.push(funcFrame);
        // the current function id is now the callee function
        interp.func = func.functionId;
        // function frame is the one we just pushed
        interp.funcFrame = interp.stack.length - 1;
        // start at the beginning of the function
        interp.ic = 0;
    }
}

/**
 * Sets the value of a reference to the result of a field access,
 * where targetRef is a reference to a struct value, and field
 * is the name of the field to access.
 */
export class FieldAccessRef extends Instruction {
    ref: number;
    targetRef: number;
    field: string;
    
    constructor(ref: number, targetRef: number, field: string) {
        super();
        this.ref = ref;
        this.targetRef = targetRef;
        this.field = field;
    }

    execute(interp: Interpreter) {
        const struct = interp.references[this.targetRef];
        interp.references[this.ref] = struct.value[this.field];
    }
}

/**
 * Sets the value of a reference to the result of an array access,
 * where targetRef is a reference to an array value, and indexRef
 * is a reference to an integer value to use as the index of the expression.
 */
export class ArrayAccessRef extends Instruction {
    ref: number;
    targetRef: number;
    indexRef: number;
    
    constructor(ref: number, targetRef: number, indexRef: number) {
        super();
        this.ref = ref;
        this.targetRef = targetRef;
        this.indexRef = indexRef;
    }

    execute(interp: Interpreter) {
        const array = interp.references[this.targetRef];
        const index = interp.references[this.indexRef] as RInteger;
        interp.references[this.ref] = array.value[index.value];
    }
}

/**
 * Sets the value of a reference to the value of a constant.
 */
export class ConstRef extends Instruction {
    ref: number;
    constRef: number;
    
    constructor(ref: number, constRef: number) {
        super();
        this.ref = ref;
        this.constRef = constRef;
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = interp.constants[this.constRef];
    }
}

/**
 * Sets the value of a reference to the result of a JS operation.
 * The inRefs parameter is an array of reference ids to use in the operation.
 * The operation parameter will receive the corresponding references as parameters
 * and should return the value to set as the reference value.
 */
export class InteropReference extends Instruction {
    ref: number;
    inRefs: number[];
    operation: (...args: RValue<any>[]) => RValue<any>;
    construct: Class<RValue<any>>;
    
    constructor(props: Partial<InteropReference> = {}) {
        super();
        Object.assign(this, props);
    }

    execute(interp: Interpreter) {
        const constructor = this.construct;
        interp.references[this.ref] = new constructor(this.operation(...this.inRefs.map(r => interp.references[r].value)));
    }
}

/**
 * Mutates a reference value.
 * The mutator function will receive the reference value
 * and should return the value to be set to the reference.
 */
export class ReferenceMutate extends Instruction {
    ref: number;
    mutator: (val: RValue<any>) => RValue<any>;
    
    constructor(props: Partial<ReferenceMutate> = {}) {
        super();
        Object.assign(this, props);
    }

    execute(interp: Interpreter) {
        interp.references[this.ref] = this.mutator(interp.references[this.ref]);
    }
}

/**
 * Copies one reference value into another reference.
 */
export class CopyRef extends Instruction {
    srcRef: number;
    destRef: number;
    
    constructor(srcRef: number, destRef: number) {
        super();
        this.srcRef = srcRef;
        this.destRef = destRef;
    }

    execute(interp: Interpreter) {
        interp.references[this.destRef] = interp.references[this.srcRef];
    }
}

// /////////////////////
// SCOPE INSTRUCTIONS //
// /////////////////////

/**
 * Adds a variable to the current scope.
 * All variables point to a reference.
 */
export class AddToScope extends Instruction {
    name: string;
    ref: number;
    
    constructor(name: string, ref: number) {
        super();
        this.name = name;
        this.ref = ref;
    }

    execute(interp: Interpreter) {
        interp.setScopeValue(this.name, interp.references[this.ref]);
    }
}

/**
 * Pushes a standard scope frame onto the scope stack.
 * Standard frames simply store variables declared within them.
 */
export class PushScopeFrame extends Instruction {
    constructor() {
        super();
    }

    execute(interp: Interpreter) {
        interp.stack.push(new ScopeFrame());
    }
}

/**
 * Pops a frame off the scope stack.
 */
export class PopFrame extends Instruction {
    constructor() {
        super();
    }

    execute(interp: Interpreter) {
        interp.stack.pop();
    }
}

/**
 * Pushes a loop scope frame onto the scope stack.
 * These are extensions of standard frames that also
 * provide semantics for break and continue statements.
 */
export class PushLoopFrame extends Instruction {
    start: number;
    end: number;
    
    constructor(props: Partial<PushLoopFrame> = {}) {
        super();
        Object.assign(this, props);
    }

    execute(interp: Interpreter) {
        interp.stack.push(new LoopFrame(this));
    }
}

/**
 * Pushes a try scope frame onto the scope stack.
 * Try frames don't store variables, but provide an error catching mechanism.
 * The error context will pop the stack looking for these,
 * and check the catches array looking for types matching the errors.
 */
export class PushTryFrame extends Instruction {
    catches: Catch[];
    finally: Finally;

    constructor(props: Partial<PushTryFrame> = {}) {
        super();
        Object.assign(this, props);
    }

    execute(interp: Interpreter) {
        interp.stack.push(new TryFrame(this.catches, this.finally));
    }
}

// /////////////////
// BRANCHES/JUMPS //
// /////////////////

/**
 * If the reference evaluates to falsy, jumps to the target.
 * Otherwise just passes through to the next instruction.
 */
export class FalseBranch extends Instruction {
    ref: number;
    target: number;
    
    constructor(props: Partial<FalseBranch> = {}) {
        super();
        Object.assign(this, props);
    }

    execute(interp: Interpreter) {
        const ref = interp.references[this.ref];
        if (!ref) interp.ic = this.target - 1;
    }
}

/**
 * If the reference evaluates to truthy, jumps to the target.
 * Otherwise just passes through to the next instruction.
 */
export class TrueBranch extends Instruction {
    ref: number;
    target: number;
    
    constructor(ref: number, target: number) {
        super();
        this.ref = ref;
        this.target = target;
    }

    execute(interp: Interpreter) {
        const ref = interp.references[this.ref];
        if (ref) interp.ic = this.target - 1;
    }
}

/**
 * Unconditionally jumps to the target instruction.
 */
export class Jump extends Instruction {
    target: number;
    
    constructor(props: Partial<Jump> = {}) {
        super();
        Object.assign(this, props);
    }

    execute(interp: Interpreter) {
        interp.ic = this.target - 1;
    }
}

/**
 * Special branch that will branch only if the specified constant has been initialized.
 * This is used to build constant wrapper functions.
 */
export class ConstBranch extends Instruction {
    constRef: number;
    target: number;
    
    constructor(props: Partial<ConstBranch> = {}) {
        super();
        Object.assign(this, props);
    }

    execute(interp: Interpreter) {
        if (this.constRef in interp.constants) interp.ic = this.target - 1;
    }
}
