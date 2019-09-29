import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class IfElseExpression extends NodeBase<SyntaxType.IfElseExpression> {
    constructor(
        location: FileRange,
        readonly condition: Expression,
        readonly consequent: Expression,
        readonly alternate: Expression
    ) { super(location, SyntaxType.IfElseExpression) }

    accept<P, R = P>(visitor: IfElseExpressionVisitor<P, R>, param: P) {
        return visitor.visitIfElseExpression(this, param);
    }
}

export interface IfElseExpressionVisitor<P, R = P> {
    visitIfElseExpression(node: IfElseExpression, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseIfElseExpression: ParseFunc<IfElseExpression> = seq(
        tok('if'),
        tok('('),
        parseExpression,
        tok(')'),
        parseExpression,
        tok('else'),
        parseExpression,
        ([_1, _2, condition, _3, consequent, _4, alternate], location) => new IfElseExpression(location, condition, consequent, alternate)
    );

    return { parseIfElseExpression };
}
