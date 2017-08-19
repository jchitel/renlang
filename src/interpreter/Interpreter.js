import { FunctionFrame, TryFrame } from './frames';
import RArray from '../runtime/Array';
import RString from '../runtime/String';
import RTuple from '../runtime/Tuple';


export default class Interpreter {
    constructor() {
        // constants table
        this.constants = {};
        // references table
        this.references = {};
        // function/scope stack
        this.stack = [];
        // error context happens when an exception is thrown
        this.errorContext = false;
    }

    execute(functions, args) {
        this.functions = functions;
        // create the Ren array containing the command line arguments
        const argsArray = new RArray(args.map(a => new RString(a)));
        // create the base function frame, pointing to the index of the main function
        const funcFrame = new FunctionFrame(0, [argsArray]);
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
                if (!this.stack.length) return this.printException();
            } else if (this.ic === this.functions[this.func].instructions.length - 1) {
                // end of function, return
                const frame = this.stack.pop();
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
        return (this.returnValue instanceof RTuple) ? 0 : this.returnValue.value;
    }

    exceptionRoutine() {
        this.stackTrace = []; // TODO: get line/column info
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
                        this.func = this.stack[funcFrame].func;
                        // use the ic just before the ic of the catch block
                        this.ic = cat.ic - 1;
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
                this.stackTrace.push(frame); // TODO: get line/column info
            }
        }
    }

    setScopeValue(name, value) {
        let frame;
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
        frame.scope[name] = value;
    }
}
