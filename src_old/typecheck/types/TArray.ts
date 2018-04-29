import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * Array type, variable sized list of homogeneous values (only one type).
 */
export default class TArray extends TType {
    /**
     * Constructor not public, use TArray.create() instead.
     */
    constructor(public baseType: TType, public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitArray(this, param);
    }

    toString() {
        return this.baseType ? `${this.baseType}[]` : '?[]';
    }
}