import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface IfElseExpression extends NodeBase<SyntaxType.IfElseExpression> {
    condition: Expression;
    consequent: Expression;
    alternate: Expression;
}

export function register(Expression: ParseFunc<Expression>) {
    const IfElseExpression: ParseFunc<IfElseExpression> = seq(
        tok('if'),
        tok('('),
        Expression,
        tok(')'),
        Expression,
        tok('else'),
        Expression,
        ([_1, _2, condition, _3, consequent, _4, alternate], location) => ({
            syntaxType: SyntaxType.IfElseExpression as SyntaxType.IfElseExpression,
            location,
            condition,
            consequent,
            alternate
        })
    );

    return { IfElseExpression };
}
