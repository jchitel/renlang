import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * Tuple type, represents a group of values of several heterogeneous types, including no values at all.
 */
export default class TTuple extends TType {
    constructor(public location?: Location, public types: TType[] = []) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitTuple(this, param);
    }

    toString() {
        return `(${this.types.map(t => t.toString()).join(', ')})`;
    }
}