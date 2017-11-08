import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors';


/**
 * Array type, variable sized list of homogeneous values (only one type).
 */
export default class TArray extends TType {
    baseType: TType;

    constructor(baseType: TType) {
        super();
        this.baseType = baseType;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitArray(this);
    }

    toString() {
        return this.baseType ? `${this.baseType}[]` : '?[]';
    }
}