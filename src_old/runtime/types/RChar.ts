import RValue from './RValue';


/**
 * JS has no equivalent for characters, but every JS API that
 * takes or returns values that are supposed to be characters (such as String.prototype.charAt())
 * uses strings for that purpose, so we will use strings here.
 */
export default class RChar extends RValue<string> {
    constructor(value: string) {
        super(value);
    }

    equals(value: RValue<any>) {
        return this.value === value.value;
    }
}
