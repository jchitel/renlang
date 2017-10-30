import TType from './TType';
import ITypeVisitor from '../visitors';


/**
 * Unicode character type, represents the set of unicode characters.
 * There is only one possible character type.
 */
export default class TChar extends TType {
    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitChar(this);
    }

    toString() {
        return 'char';
    }
}