import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * Union type, inverse of tuple, there is only one value, but it can be of potentially several types.
 * These are structured as a binary tree.
 */
export default class TUnion extends TType {
    constructor(public location?: Location, public types: TType[] = []) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitUnion(this, param);
    }

    toString() {
        return this.types.map(t => t.toString()).join(' | ');
    }
}