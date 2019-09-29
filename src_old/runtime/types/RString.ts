import RValue from './RValue';


/**
 * Even though a Ren string is technically an array of characters,
 * it makes sense to just use JS strings here, because using an array
 * of strings is too much overhead for our purposes.
 */
export default class RString extends RValue<string> {
    constructor(str: string) {
        super(str);
    }

    concat(string: RString) {
        return new RString(this.value + string.value);
    }

    equals(value: RValue<any>) {
        return this.value === value.value;
    }
}
