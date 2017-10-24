import RValue, { ReferenceValue } from './RValue';


/**
 * The value of an RArray is a JS array of RValues of the same type.
 * So you can have an array of all strings, but you can't have an array
 * of strings and chars, even though both extend from RValue<string>.
 * This constraint doesn't "technically" need to apply, but it adds
 * a bit of type checking along with Ren's own type checking.
 */
export default class RArray extends ReferenceValue {
    refs: number[];

    constructor(refs: number[]) {
        super();
        this.refs = refs;
    }

    concat(array: RArray) {
        return new RArray([...this.refs, ...array.refs]);
    }

    equals(value: RValue<any>) {
        // do a simple value comparison (will work if they are the same array)
        if (this.value === value.value) return true;
        // verify that the other one is an array
        if (!Array.isArray(value.value)) return false;
        // verify the length
        const array: RArray = value as RArray;
        if (this.refs.length !== array.refs.length) return false;
        // check each element (only reference equality)
        return this.refs.every((v, i) => v === array.refs[i]);
    }
}
