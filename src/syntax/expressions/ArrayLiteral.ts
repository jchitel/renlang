import { SyntaxType, Expression, NodeBase } from '~/syntax/environment';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';
import { FileRange } from '~/core';


export class ArrayLiteral extends NodeBase<SyntaxType.ArrayLiteral> {
    constructor(
        location: FileRange,
        readonly items: ReadonlyArray<Expression>
    ) { super(location, SyntaxType.ArrayLiteral) }

    accept<P, R = P>(visitor: ArrayLiteralVisitor<P, R>, param: P) {
        return visitor.visitArrayLiteral(this, param);
    }
}

export interface ArrayLiteralVisitor<P, R = P> {
    visitArrayLiteral(node: ArrayLiteral, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseArrayLiteral: ParseFunc<ArrayLiteral> = seq(
        tok('['),
        repeat(parseExpression, '*', tok(',')),
        tok(']'),
        ([_1, items, _2], location) => new ArrayLiteral(location, items)
    );

    return { parseArrayLiteral };
}
