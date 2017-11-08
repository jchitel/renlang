import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors';


/**
 * Union type, inverse of tuple, there is only one value, but it can be of potentially several types.
 * These are structured as a binary tree.
 */
export default class TUnion extends TType {
    types: TType[];

    constructor(types: TType[] = []) {
        super();
        this.types = types;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitUnion(this);
    }

    toString() {
        return this.types.map(t => t.toString()).join(' | ');
    }
}