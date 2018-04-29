import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * Integer type, represents a set of integer numbers.
 * Each integer type has a size (in bits) that determines the highest possible value of the type,
 * and a signed flag, indicating whether or not negative values are included.
 */
export default class TInteger extends TType {
    constructor(public location?: Location, public size: number = Infinity, public signed: boolean = true) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitInteger(this, param);
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