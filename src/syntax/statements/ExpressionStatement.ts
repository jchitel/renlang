import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq } from '~/parser/parser';


export interface ExpressionStatement extends NodeBase<SyntaxType.ExpressionStatement> {
    expression: Expression;
}

export function register(Expression: ParseFunc<Expression>) {
    const ExpressionStatement: ParseFunc<ExpressionStatement> = seq(
        Expression,
        (expression, location) => ({
            syntaxType: SyntaxType.ExpressionStatement as SyntaxType.ExpressionStatement,
            location,
            expression
        })
    );

    return { ExpressionStatement };
}
