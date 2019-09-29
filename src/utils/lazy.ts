import { CoreObject } from '~/core';


/**
 * This is a simple interface for lazy evaluation in TS.
 * 
 * The following is the specification of a lazy value:
 * - A lazy value should not be evaluated until it is required
 * - A lazy value should be evaluated at most once
 * - A lazy value should never change
 * 
 * A simple implementation of lazy logic is provided by the lazy()
 * function in this module. This is sufficient in almost all
 * cases, but Lazy values can be created by other means as well.
 * Just as long as the value implements this interface and
 * conforms to the above specification, it is a Lazy value.
 */
export default interface Lazy<T> {
    readonly value: T;
}

class SimpleLazy<T> extends CoreObject implements Lazy<T> {
    private _value?: T;

    constructor(private evaluator: () => T) {
        super();
    }

    get value(): T {
        return !('_value' in this) ? (this._value = this.evaluator()) : this._value as T;
    }
}

/**
 * This creates a simple lazy value which uses delayed evaluation
 * and memoization to implement laziness. The value is taken from
 * the return value of the provided evaluator function.
 * The evaluator should NOT have any side effects.
 * 
 * NOTE: This memoization technique is not referentially transparent
 * because it saves the evaluated result internally, but this is required
 * because JavaScript doesn't have a first-class memoization
 * mechanism.
 */
export function lazy<T>(evaluator: () => T): Lazy<T> {
    return new SimpleLazy(evaluator);
}
