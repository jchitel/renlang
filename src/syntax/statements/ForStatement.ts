import { NodeBase, SyntaxType, Expression, Statement } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface ForStatement extends NodeBase<SyntaxType.ForStatement> {
    variable: Token;
    iterable: Expression;
    body: Statement;
}

export function register(Expression: ParseFunc<Expression>, Statement: ParseFunc<Statement>) {
    const ForStatement: ParseFunc<ForStatement> = seq(
        tok('for'),
        tok('('),
        tok(TokenType.IDENT),
        tok('in'),
        Expression,
        tok(')'),
        Statement,
        ([_1, _2, variable, _3, iterable, _4, body], location) => ({
            syntaxType: SyntaxType.ForStatement as SyntaxType.ForStatement,
            location,
            variable,
            iterable,
            body
        })
    );

    return { ForStatement };
}
