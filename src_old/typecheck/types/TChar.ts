import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * Unicode character type, represents the set of unicode characters.
 * There is only one possible character type.
 */
export default class TChar extends TType {
    constructor(public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitChar(this, param);
    }

    toString() {
        return 'char';
    }
}