import RValue from './RValue';


/**
 * The underlying runtime value of a Ren bool is a JS boolean.
 * Pretty simple.
 */
export default class RBool extends RValue<boolean> {
    constructor(value: boolean) {
        super(value);
    }

    equals(value: RValue<any>) {
        return this.value === value.value;
    }
}
