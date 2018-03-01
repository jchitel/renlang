import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface ThrowStatement extends NodeBase {
    syntaxType: SyntaxType.ThrowStatement;
    exp: Expression;
}

export function register(Expression: ParseFunc<Expression>) {
    const ThrowStatement: ParseFunc<ThrowStatement> = seq(
        tok('throw'),
        Expression,
        ([_, exp], location) => ({
            syntaxType: SyntaxType.ThrowStatement as SyntaxType.ThrowStatement,
            location,
            exp
        })
    );

    return { ThrowStatement };
}
