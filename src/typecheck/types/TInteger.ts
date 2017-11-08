import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors';


/**
 * Integer type, represents a set of integer numbers.
 * Each integer type has a size (in bits) that determines the highest possible value of the type,
 * and a signed flag, indicating whether or not negative values are included.
 */
export default class TInteger extends TType {
    size: number;
    signed: boolean;

    constructor(size: number = Infinity, signed: boolean = true) {
        super();
        this.size = size;
        this.signed = signed;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitInteger(this);
    }

    toString() {
        if (this.size === null || this.signed === null) return 'integer';
        let str = this.signed ? 'signed ' : 'unsigned ';
        if (this.size !== Infinity) {
            str += `${this.size}-bit integer`;
        } else {
            str += 'unbounded integer';
        }
        return str;
    }
}