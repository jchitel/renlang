import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors';


/**
 * Boolean type, contains two values: true and false.
 * Has a wide array of uses.
 */
export default class TBool extends TType {
    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitBool(this);
    }

    toString() {
        return 'bool';
    }
}