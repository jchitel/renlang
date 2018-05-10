import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';
import { FileRange } from '~/core';


export class TupleLiteral extends NodeBase<SyntaxType.TupleLiteral> {
    constructor(
        location: FileRange,
        readonly items: ReadonlyArray<Expression>
    ) { super(location, SyntaxType.TupleLiteral) }

    accept<P, R = P>(visitor: TupleLiteralVisitor<P, R>, param: P) {
        return visitor.visitTupleLiteral(this, param);
    }
}

export interface TupleLiteralVisitor<P, R = P> {
    visitTupleLiteral(node: TupleLiteral, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseTupleLiteral: ParseFunc<TupleLiteral> = seq(
        tok('('),
        repeat(parseExpression, '*', tok(',')),
        tok(')'),
        ([_1, items, _2], location) => new TupleLiteral(location, items)
    );

    return { parseTupleLiteral };
}
