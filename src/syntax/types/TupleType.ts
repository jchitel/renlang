import { NodeBase, SyntaxType, Type } from '~/syntax/environment';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';
import { FileRange } from '~/core';


export class TupleType extends NodeBase<SyntaxType.TupleType> {
    constructor(
        location: FileRange,
        readonly types: ReadonlyArray<Type>
    ) { super(location, SyntaxType.TupleType) }

    accept<P, R = P>(visitor: TupleTypeVisitor<P, R>, param: P) {
        return visitor.visitTupleType(this, param);
    }
}

export interface TupleTypeVisitor<P, R = P> {
    visitTupleType(node: TupleType, param: P): R;
}

export function register(parseType: ParseFunc<Type>) {
    const parseTupleType: ParseFunc<TupleType> = seq(
        tok('('),
        repeat(parseType, '*', tok(',')),
        tok(')'),
        ([_1, types, _2], location) => new TupleType(location, types)
    );

    return { parseTupleType };
}
