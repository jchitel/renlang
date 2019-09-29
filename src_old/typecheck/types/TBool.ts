import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * Boolean type, contains two values: true and false.
 * Has a wide array of uses.
 */
export default class TBool extends TType {
    constructor(public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitBool(this, param);
    }

    toString() {
        return 'bool';
    }
}