import TType from './TType';
import { Declaration } from '~/syntax';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * We can't have recursively defined objects, so this class serves
 * to represent the point of recursion for a recursively defined type.
 * The assignability of the type is just based on the assignability of
 * the referenced type.
 * TODO: this may not work the way we want it to.
 */
export default class TRecursive extends TType {
    constructor(public decl: Declaration, public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitRecursive(this, param);
    }

    toString() {
        return this.decl.type.toString();
    }
}