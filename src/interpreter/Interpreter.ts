import { ScopeFrame, FunctionFrame, TryFrame } from './frames';
import RValue, { RArray, RString, RTuple } from '../runtime/types';
import Func from '../translator/Func';


export default class Interpreter {
    /**
     * Pre-runtime environment (does not change during runtime)
     */

    // Table of functions in the application
    functions: Func[];

    /**
     * Runtime environment (changes during runtime)
     */

    // Table of module-scoped constants, which are NOT references
    constants: { [id: number]: RValue<any> };
    // Table of runtime references
    references: { [id: number]: RValue<any> };
    // The runtime stack, containing all frames in the current scope of execution
    stack: ScopeFrame[];
    // Reference to the return value of a completed function
    returnValue: RValue<any>;

    /**
     * Error environment (used in error handling)
     */

    // Flag indicating whether the interpreter is currently processing an error
    errorContext: boolean;
    // Reference to the value of the thrown error
    error: RValue<any>;
    // in the event of an error, the list of function frames popped off the stack during the exception routine
    stackTrace: FunctionFrame[];

    /**
     * Runtime control values (values that control execution)
     */

    // Index of the currently executing function
    func: number;
    // Index of the frame of the currently executing function
    funcFrame: number;
    // "Instruction Counter", the currently executing instruction within the current function
    ic: number;

    constructor(functions: Func[]) {
        this.functions = functions;
        this.constants = {};
        this.references = {};
        this.stack = [];
        this.errorContext = false;
    }

    /**
     * Top-level method to start the interpreter.
     * This will create a runtime value for the command-line arguments,
     * initialize the stack and runtime control values,
     * then run the interpreter, returning the return value of the program.
     */
    execute(args: string[]) {
        // create the Ren array containing the command line arguments
        const argRefs: number[] = [];
        for (let i = 0; i < args.length; ++i) {
            this.references[-i - 1] = new RString(args[i]);
            argRefs.push(-i - 1);
        }
        const argsArray = new RArray(argRefs);
        // create the base function frame, pointing to the index of the main function
        const funcFrame = new FunctionFrame({ func: 0, args: [argsArray] });
        this.stack.push(funcFrame);
        // the index of the current executing function
        this.func = 0;
        this.funcFrame = 0;
        // run the interpreter, the return value is the exit code
        return this.run();
    }

    /**
     * The interpreter is controlled via 3 things: the stack, the current function id, and the ic value.
     *
     * # The Stack
     *
     * The stack stores all frames of the current execution context, which can be:
     * - function frames (the frame of a function execution context)
     * - scope frames (base frame that only stores a scope)
     * - loop frames (scope frames that represent a loop context)
     * - try frames (represent an error-catching context)
     * These frames all can contain variable-reference mappings (scope) which can be popped off to "remove" those variables from scope.
     * They also set delimiters on context. For example, function frames cut off the farthest extent of the scope, and variables in previous
     * frames cannot be accessed by the current function. Loop frames set loop delimiters, which are used by break and continue statements
     * to determine which loop to jump in/out of. Try frames are checkpoints for exceptions as they ascend up the stack. Try frames with a catch
     * that matches the exception type will cause execution to jump into that catch block.
     * As frames are entered, a frame is pushed onto the stack, and frames are popped off as they are left.
     *
     * # Function id and Instruction Counter
     *
     * The execution context also contains the id of the currently executing function, which is how the interpreter knows which instructions it is running.
     * The ic (instruction counter) is a pointer to the current instruction of the current function.
     * Insutrctions can modify this to perform a "jump" to a different instruction.
     * The combination of function id and ic specifies the location of the current instruction.
     *
     * # Operation
     *
     * The interpreter starts with a function id of 0 (the main function) and an ic of 0 (the first instruction of the main function).
     * To run, the interpreter grabs the function at the function id, then the instruction in the function at the ic, and then executes it.
     * The ic is incremented from whatever value it has after the instruction, and then that instruction is executed.
     * This process is interrupted by two things: function completion and exceptions.
     *
     * ## Function completion
     *
     * The interpreter will continue iterating over instructions until it reaches an ic value AFTER the last instruction of the function.
     * Once it reaches this point, it knows that it needs to return to the caller function.
     * The instructions are responsible for copying the return value into the returnValue field of the interpreter,
     * and for making sure the ic is at the end of the function immediately after this.
     * The function frame contains two values for facilitating returning from a function: returnRef and returnIc.
     * The interpreter takes its returnValue field and places it into the returnRef reference, where the caller will be able to access it.
     * Then the interpreter pops the function frame off the stack, sets the function id to the id in the previous function frame,
     * and sets the ic value to the returnIc value from the popped frame. This is enough to switch back to the caller function,
     * and then execution continues as normal there.
     *
     * ### Program completion
     *
     * Eventually the interpreter will make its way to the end of the main function, at which point it will check the stack and it will be empty.
     * At this point the returnValue field will either be an integer (exit code) or an empty tuple (default exit code 0). This value
     * will be used as the exit code of the program, and will bubble up to the node interpreter to be used as the exit code for the whole process.
     *
     * ## Exceptions
     *
     * Exceptions are triggered from two places: throw instructions and the runtime. Both will do the same thing: switch the interpreter
     * to the error context, and set the error field on the interpreter to some error object.
     * After every instruction, the interpreter checks the errorContext flag, as soon as it is true, it moves into an exception routine.
     * This routine pops frames off of the stack until it reaches a try frame with a catch block matching the type of the error value.
     * As it pops function frames, it builds a stack trace so that it is known where the error occurred.
     * As soon as a matching catch block is found, the execution context is set to the function containing the catch block
     * and the start instruction of the catch block. The stack will be set correctly because that's what this has been based off of.
     * The errorContext flag will be set to false, and execution will proceed as normal.
     *
     * ### Uncaught exceptions
     *
     * If the stack is emptied during the error context, it means that the exception was uncaught. In this instance, the error value is
     * printed to stderr, followed by a string representation of the stack trace. Then the interpreter bubbles up an error exit code to the node
     * interpreter to be used as the exit code of the process.
     */
    run() {
        for (this.ic = 0; this.ic <= this.functions[this.func].instructions.length; ++this.ic) {
            // execute current instruction
            this.functions[this.func].instructions[this.ic].execute(this);
            // check for error or return
            if (this.errorContext) {
                // exception was thrown
                this.exceptionRoutine();
                if (!this.stack.length) {
                    this.printException();
                    return -1;
                }
            } else if (this.ic === this.functions[this.func].instructions.length - 1) {
                // end of function, return
                const frame = this.stack.pop() as FunctionFrame;
                if (!this.stack.length) break; // main function just ended
                // put return value at the expected reference
                this.references[frame.returnRef] = this.returnValue;
                // switch context back to caller function
                this.func = frame.callerId;
                this.ic = frame.returnIc;
                this.funcFrame = frame.callerFuncFrame;
            }
        }
        // program finished; if void, use 0, otherwise use the integer value
        return (this.returnValue instanceof RTuple) ? 0 : this.returnValue.value as number;
    }

    printException() {
        process.stdout.write(`Runtime error:
  ${this.error.toString()}
Stack trace:
${this.stackTrace.map(f => `  ${this.functions[f.func].getStackEntry()}`)}`);
    }

    exceptionRoutine() {
        this.stackTrace = [];
        // hold onto the index of the frame of the current function
        let funcFrame = this.funcFrame;
        // while there are still frames in the stack
        while (this.stack.length) {
            const frame = this.stack.pop();
            if (frame instanceof TryFrame) {
                // look for a matching catch
                for (const cat of frame.catches) {
                    if (this.error.type.isAssignableFrom(cat.type)) {
                        // get the function id of the current function frame
                        this.func = (this.stack[funcFrame] as FunctionFrame).func;
                        // use the ic just before the ic of the catch block
                        this.ic = cat.start - 1;
                        // the current function frame is now the execution context's function frame
                        this.funcFrame = funcFrame;
                        return;
                    }
                }
                if (frame.finally) {
                    frame.executeFinally(this);
                }
            } else if (frame instanceof FunctionFrame) {
                // get the caller function frame and add this function to the stack trace
                funcFrame = frame.callerFuncFrame;
                this.stackTrace.push(frame);
            }
        }
    }

    setScopeValue(name: string, value: RValue<any>) {
        let frame: ScopeFrame | undefined;
        for (let i = this.stack.length - 1; i >= 0; --i) {
            // skip try frames
            if (this.stack[i] instanceof TryFrame) continue;
            // the first frame we set should be the first normal-type frame
            if (!frame) frame = this.stack[i];
            // if the specified name is in the frame, use this one instead
            if (name in this.stack[i]) {
                frame = this.stack[i];
                break;
            }
        }
        (frame as ScopeFrame).scope[name] = value;
    }

    /**
     * Performs a typed JS operation on a reference, returning a new runtime value 
     */
    operateOnRef<T, U>(ref: number, operation: (value: T) => U, constructor: Class<RValue<U>>): RValue<U> {
        const val = this.references[ref];
        return new constructor(operation(val.value));
    }

    /**
     * Performs a typed JS operation on two references, returning a new runtime value 
     */
    operateOnRefs<T1, T2, U>(ref1: number, ref2: number, operation: (v1: T1, v2: T2) => U, constructor: Class<RValue<U>>): RValue<U> {
        const v1 = this.references[ref1];
        const v2 = this.references[ref2];
        return new constructor(operation(v1.value, v2.value));
    }

    /**
     * Does the same thing as operateOnRefs(), but creates a value of the same type as the first value,
     * stores that value as the new value of the first reference, and returns it. 
     */
    assignment<T1, T2>(ref1: number, ref2: number, operation: (v1: T1, v2: T2) => T1): RValue<T1> {
        const v1 = this.references[ref1];
        const v2 = this.references[ref2];
        const constructor = v1.constructor as Class<RValue<T1>>;
        const newVal = new constructor(operation(v1.value, v2.value));
        this.references[ref1] = newVal;
        return newVal;
    }
}
