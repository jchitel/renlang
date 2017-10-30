import TType from './TType';
import { TypeDeclaration } from '../../syntax/declarations';
import ITypeVisitor from '../visitors';


/**
 * We can't have recursively defined objects, so this class serves
 * to represent the point of recursion for a recursively defined type.
 * The assignability of the type is just based on the assignability of
 * the referenced type.
 * TODO: this may not work the way we want it to.
 */
export default class TRecursive extends TType {
    decl: TypeDeclaration;

    constructor(decl: TypeDeclaration) {
        super();
        this.decl = decl;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitRecursive(this);
    }

    toString() {
        return this.decl.type.toString();
    }
}