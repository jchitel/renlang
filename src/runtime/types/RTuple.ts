import RValue, { ReferenceValue } from './RValue';


/**
 * Tuples are a fixed-length list of values.
 * This is similar to an array, but the types of elements
 * can be heterogeneous.
 * This means that runtime tuples can simply be backed by
 * an array of any Ren values.
 */
export default class RTuple extends ReferenceValue {
    refs: number[];

    constructor(refs: number[]) {
        super();
        this.refs = refs;
    }
    
    equals(value: RValue<any>) {
        // do a simple value comparison (will work if they are the same array)
        if (this.value === value.value) return true;
        // verify that the other one is an array
        if (!Array.isArray(value.value)) return false;
        // verify the length
        const tuple: RTuple = value as RTuple;
        if (this.refs.length !== tuple.refs.length) return false;
        // check each element
        return this.refs.every((v, i) => v === tuple.refs[i]);
    }
}
