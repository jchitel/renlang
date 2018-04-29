import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * Floating point type, represents a set of potentially fractional numbers.
 * Each floating point type has a size (in bits) that determines the precision of the type.
 * The data of floating point numbers consists of the bits of precision (called the mantissa),
 * the bits of an exponent (the distance from the MSB of the mantissa and the ones place),
 * and the sign of the number.
 */
export default class TFloat extends TType {
    constructor(public location?: Location, public size: number = 64) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitFloat(this, param);
    }

    toString() {
        return `${this.size}-bit float`;
    }
}