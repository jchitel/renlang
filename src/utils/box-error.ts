/**
 * This type of error is used to hold onto a value that is the output
 * of an operation that reaches a fail condition.
 * This should be used only as an container for a value used to escape
 * from a process with an output value.
 */
export default class BoxError<T> extends Error {
    constructor(public readonly value: T) {
        super();
    }
}
