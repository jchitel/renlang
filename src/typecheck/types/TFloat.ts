import TType from './TType';
import ITypeVisitor from '../visitors';


/**
 * Floating point type, represents a set of potentially fractional numbers.
 * Each floating point type has a size (in bits) that determines the precision of the type.
 * The data of floating point numbers consists of the bits of precision (called the mantissa),
 * the bits of an exponent (the distance from the MSB of the mantissa and the ones place),
 * and the sign of the number.
 */
export default class TFloat extends TType {
    size: number;

    constructor(size: number) {
        super();
        this.size = size;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitFloat(this);
    }

    toString() {
        return `${this.size}-bit float`;
    }
}