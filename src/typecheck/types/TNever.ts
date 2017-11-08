import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors';


/**
 * 'never' is the empty set for types.
 * It is the type of an intersection between two unrelated types.
 * It is also the return type of a function that never returns.
 * 'never' is (for now) only used to represent the types of statements that cannot
 * contribute to the return value of a function:
 * - break/continue
 * - noop ({})
 * - throw
 * A union of a type A with 'never' is just A.
 * Thus, it is assignable to all types.
 */
export default class TNever extends TType {
    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitNever(this);
    }

    toString() {
        return 'never';
    }
}
