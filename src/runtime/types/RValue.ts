import { TType } from '~/typecheck/types';


/**
 * This is the base class of all runtime values in the Ren interpreter.
 * Every Ren value is backed by an equivalent JS value.
 * The type parameter T is the type of JS values that can be used for this Ren type.
 */
export default abstract class RValue<T> {
    readonly value: T;
    type: TType;

    constructor(value: T) {
        this.value = value;
    }

    abstract equals(value: RValue<any>): boolean;
}

export abstract class ReferenceValue extends RValue<null> {
    constructor() {
        super(null);
    }
}
