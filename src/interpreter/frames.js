/**
 * A base frame, contains only a scope for storing variable references
 */
export class ScopeFrame {
    constructor() {
        this.scope = {};
    }
}

/**
 * A function frame, contains information about the current executing function.
 */
export class FunctionFrame extends ScopeFrame {
    constructor(func, args, returnRef, callerId, callerFuncFrame, returnIc) {
        super();
        // function id of the function this frame refers to
        this.func = func;
        // array of arg values of the function
        this.args = args;
        // reference that the return value of the function should be copied into
        this.returnRef = returnRef;
        // function id of the caller function
        this.callerId = callerId;
        this.callerFuncFrame = callerFuncFrame;
        // ic value that the function should return to when switching back to the caller
        this.returnIc = returnIc;
    }
}

/**
 * A loop frame, exactly the same as a scope frame, but is special to handle
 * breaks and continues
 */
export class LoopFrame extends ScopeFrame {
    constructor(start, end) {
        super();
        this.start = start;
        this.end = end;
    }
}

/**
 * A try frame, contains information about a try-catch block for catching errors
 */
export class TryFrame extends ScopeFrame {
    constructor(catches, fin) {
        super();
        this.catches = catches;
        this.finally = fin;
    }

    executeFinally(interp) {
        for (let i = this.finally.start; i < this.finally.end; ++i) {
            interp.functions[interp.func].instructions[i].execute(interp);
        }
    }
}
