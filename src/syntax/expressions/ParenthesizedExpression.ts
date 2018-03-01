import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface ParenthesizedExpression extends NodeBase {
    syntaxType: SyntaxType.ParenthesizedExpression;
    inner: Expression;
}

export function register(Expression: ParseFunc<Expression>) {
    const ParenthesizedExpression: ParseFunc<ParenthesizedExpression> = seq(
        tok('('),
        Expression,
        tok(')'),
        ([_1, inner, _2], location) => ({
            syntaxType: SyntaxType.ParenthesizedExpression as SyntaxType.ParenthesizedExpression,
            location,
            inner
        })
    );

    return { ParenthesizedExpression };
}
