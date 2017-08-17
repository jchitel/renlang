import { FunctionFrame, TryFrame } from './frames';
import RArray from '../runtime/Array';
import RString from '../runtime/String';


export default class Interpreter {
    constructor() {
        // constants table
        this.constants = {};
        // references table
        this.references = {};
        // function/scope stack
        this.stack = [];
    }

    execute(functions, args) {
        this.functions = functions;
        // get the main function
        const mainFunction = functions[0];
        // create the Ren array containing the command line arguments
        const argsArray = new RArray(args.map(a => new RString(a)));
        // create the base function frame
        const funcFrame = new FunctionFrame(mainFunction, [argsArray]);
        this.stack.push(funcFrame);
        // execute the function
        this.executeFunction(mainFunction, funcFrame);
    }

    executeFunction(func, frame) {
        // save the frame so that instructions can access it (for params, for example)
        this.currentFuncFrame = frame;
        // initializing the ic to 0, execute each instruction. instructions can modify the ic value (jumps/branches)
        for (this.ic = 0; this.ic < func.instructions.length; ++this.ic) {
            func.instructions.execute(this);
        }
        // stack frame balancing is guaranteed by the translation process, so the current top of the stack is the function frame
        this.stack.pop();
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
