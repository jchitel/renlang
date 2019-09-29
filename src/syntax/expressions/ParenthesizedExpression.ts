import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class ParenthesizedExpression extends NodeBase<SyntaxType.ParenthesizedExpression> {
    constructor(
        location: FileRange,
        readonly inner: Expression
    ) { super(location, SyntaxType.ParenthesizedExpression) }

    accept<P, R = P>(visitor: ParenthesizedExpressionVisitor<P, R>, param: P) {
        return visitor.visitParenthesizedExpression(this, param);
    }
}

export interface ParenthesizedExpressionVisitor<P, R = P> {
    visitParenthesizedExpression(node: ParenthesizedExpression, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseParenthesizedExpression: ParseFunc<ParenthesizedExpression> = seq(
        tok('('),
        parseExpression,
        tok(')'),
        ([_1, inner, _2], location) => new ParenthesizedExpression(location, inner)
    );

    return { parseParenthesizedExpression };
}
