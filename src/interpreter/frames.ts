import Interpreter from './Interpreter';
import RValue from '~/runtime/types';
import { TType } from '~/typecheck/types';


/**
 * A base frame, contains only a scope for storing variable references
 */
export class ScopeFrame {
    scope: { [name: string]: RValue<any> };

    constructor() {
        this.scope = {};
    }
}

/**
 * A function frame, contains information about the current executing function.
 */
export class FunctionFrame extends ScopeFrame {
    // function id of the function this frame refers to
    func: number;
    // array of arg values of the function
    args: RValue<any>[];
    // reference that the return value of the function should be copied into
    returnRef: number;
    // function id of the caller function
    callerId: number;
    callerFuncFrame: number;
    // ic value that the function should return to when switching back to the caller
    returnIc: number;

    constructor(props: Partial<FunctionFrame> = {}) {
        super();
        Object.assign(this, props);
    }
}

/**
 * A loop frame, exactly the same as a scope frame, but is special to handle
 * breaks and continues
 */
export class LoopFrame extends ScopeFrame {
    start: number;
    end: number;

    constructor(props: Partial<LoopFrame> = {}) {
        super();
        Object.assign(this, props);
    }
}

export type Catch = { type: TType, start: number };
export type Finally = { start: number, end: number };

/**
 * A try frame, contains information about a try-catch block for catching errors
 */
export class TryFrame extends ScopeFrame {
    catches: Catch[];
    finally: Finally;

    constructor(catches: Catch[], fin: Finally) {
        super();
        this.catches = catches;
        this.finally = fin;
    }

    executeFinally(interp: Interpreter) {
        for (let i = this.finally.start; i < this.finally.end; ++i) {
            interp.functions[interp.func].instructions[i].execute(interp);
        }
    }
}
