import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';


/**
 * "any" type, all types are assignable to "any".
 * This type is NOT the "catch all" type that it is in TypeScript.
 * It is a type that can be used to RECEIVE any type.
 * That inherently means that because it can be any type,
 * it CANNOT be used for any specific type.
 * The only type that can do that is 'never', which is the opposite
 * of 'any'.
 * 'any' should be thought of as the supertype of all types.
 */
export default class TAny extends TType {
    constructor(public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitAny(this, param);
    }

    toString() {
        return 'any';
    }
}
