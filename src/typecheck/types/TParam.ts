import TType from './TType';
import ITypeVisitor from '../visitors';


export type Variance = 'covariant' | 'contravariant' | 'invariant';

/**
 * Represents the type of an untyped type parameter, used in TGeneric and wherever
 * a type parameters is used.
 */
export default class TParam extends TType {
    name: string;
    variance: Variance;
    constraint: TType;

    constructor(name: string, variance: Variance, constraint: TType) {
        super();
        this.name = name;
        this.variance = variance;
        this.constraint = constraint;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitParam(this);
    }

    createTypeArg(t: TType) {
        return new TArg(this, t);
    }
}

export class TArg extends TType {
    variance: Variance;
    type: TType;

    constructor(param: TParam, type: TType) {
        super();
        this.variance = param.variance;
        this.type = type;
    }

    visit<T>(visitor: ITypeVisitor<T>) {
        return visitor.visitArg(this);
    }
}
