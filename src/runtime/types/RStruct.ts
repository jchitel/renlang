import RValue, { ReferenceValue } from './RValue';


type StructOfRefs = { [field: string]: number };

/**
 * Similarly to how runtime arrays are just JS arrays of Ren values,
 * runtime structs are JS objects containing Ren values as values.
 * Since Ren structs always have a fixed set of static keys,
 * where that set of keys will always fit into the set of strings,
 * we say that runtime structs must be keyed by strings (as opposed to numbers or symbols).
 */
export default class RStruct extends ReferenceValue {
    refs: StructOfRefs;

    constructor(refs: StructOfRefs) {
        super();
        this.refs = refs;
    }

    equals(value: RValue<any>) {
        // first do simple strict equality check
        if (this.value === value.value) return true;
        // make sure it is an object
        if (typeof value.value !== 'object') return false;
        // check the length of the keys
        const struct: RStruct = value as RStruct;
        const thisKeys = Object.keys(this.value);
        const structKeys = Object.keys(struct.value);
        if (thisKeys.length !== structKeys.length) return false;
        // make sure the keys are all equal
        thisKeys.sort();
        structKeys.sort();
        if (!thisKeys.every((k, i) => k === structKeys[i])) return false;
        // make sure the values are all equal (reference check only)
        return thisKeys.every(k => this.refs[k] === struct.refs[k]);
    }
}
