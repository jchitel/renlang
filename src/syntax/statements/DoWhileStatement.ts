import { NodeBase, SyntaxType, Statement, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface DoWhileStatement extends NodeBase<SyntaxType.DoWhileStatement> {
    body: Statement;
    condition: Expression;
}

export function register(Expression: ParseFunc<Expression>, Statement: ParseFunc<Statement>) {
    const DoWhileStatement: ParseFunc<DoWhileStatement> = seq(
        tok('do'),
        Statement,
        tok('while'),
        tok('('),
        Expression,
        tok(')'),
        ([_1, body, _2, _3, condition, _4], location) => ({
            syntaxType: SyntaxType.DoWhileStatement as SyntaxType.DoWhileStatement,
            location,
            body,
            condition
        })
    );

    return { DoWhileStatement };
}
