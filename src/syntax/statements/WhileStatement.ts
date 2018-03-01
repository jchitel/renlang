import { NodeBase, SyntaxType, Expression, Statement } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface WhileStatement extends NodeBase {
    syntaxType: SyntaxType.WhileStatement;
    condition: Expression;
    body: Statement;
}

export function register(Expression: ParseFunc<Expression>, Statement: ParseFunc<Statement>) {
    const WhileStatement: ParseFunc<WhileStatement> = seq(
        tok('while'),
        tok('('),
        Expression,
        tok(')'),
        Statement,
        ([_1, _2, condition, _3, body], location) => ({
            syntaxType: SyntaxType.WhileStatement as SyntaxType.WhileStatement,
            location,
            condition,
            body
        })
    );

    return { WhileStatement };
}
