import TType from './TType';
import ITypeVisitor from '../visitors';


/**
 * Tuple type, represents a group of values of several heterogeneous types, including no values at all.
 */
export default class TTuple extends TType {
    types: TType[];

    constructor(types: TType[]) {
        super();
        this.types = types;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitTuple(this);
    }

    toString() {
        return `(${this.types.map(t => t.toString()).join(', ')})`;
    }
}