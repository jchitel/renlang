import TType from './TType';
import ITypeVisitor from '~/typecheck/visitors/ITypeVisitor';
import { Location } from '~/parser/Tokenizer';
import OrderedMap from '~/utils/OrderedMap';


export type Variance = 'covariant' | 'contravariant' | 'invariant';

/**
 * Represents the type of an untyped type parameter, used in TGeneric and wherever
 * a type parameters is used.
 */
export default class TParam extends TType {
    constructor(
        public name: string,
        public variance: Variance,
        public constraint: TType,
        public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitParam(this, param);
    }

    createTypeArg(t: TType) {
        return new TArg(this.variance, t);
    }
}

export class TParams extends TType {
    constructor(
        public params: OrderedMap<TParam>,
        public location?: Location
    ) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitParams(this, param);
    }
}

export class TArg extends TType {
    constructor(public variance: Variance, public type: TType, public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitArg(this, param);
    }
}

export class TArgs extends TType {
    constructor(public args: TArg[], public location?: Location) {
        super();
    }

    visit<T, P = undefined>(visitor: ITypeVisitor<T, P>, param?: P) {
        return visitor.visitArgs(this, param);
    }
}
