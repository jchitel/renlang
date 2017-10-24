import RValue from './RValue';


/**
 * Since JS has no distinction between floating-point and integer numbers,
 * using their built-in "number" type, which is backed by floating-point numbers,
 * is the only option here.
 */
export default class RInteger extends RValue<number> {
    constructor(value: number) {
        super(value);
    }

    equals(value: RValue<any>) {
        return this.value === value.value;
    }
}
