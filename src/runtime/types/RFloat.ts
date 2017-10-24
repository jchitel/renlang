import RValue from './RValue';


/**
 * All JS numbers are technically floats, so we just use number here.
 */
export default class RFloat extends RValue<number> {
    constructor(value: number) {
        super(value);
    }

    equals(value: RValue<any>) {
        return this.value === value.value;
    }
}
