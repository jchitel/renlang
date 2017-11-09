import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors';


export default class TInferred extends TType {
    visit<T>(visitor: ITypeVisitor<T>): T {
        return visitor.visitInferred(this);
    }
}