import { NodeBase, SyntaxType, Expression, Statement } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class ForStatement extends NodeBase<SyntaxType.ForStatement> {
    constructor(
        location: FileRange,
        readonly variable: Token,
        readonly iterable: Expression,
        readonly body: Statement
    ) { super(location, SyntaxType.ForStatement) }

    accept<P, R = P>(visitor: ForStatementVisitor<P, R>, param: P) {
        return visitor.visitForStatement(this, param);
    }
}

export interface ForStatementVisitor<P, R = P> {
    visitForStatement(node: ForStatement, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>, parseStatement: ParseFunc<Statement>) {
    const parseForStatement: ParseFunc<ForStatement> = seq(
        tok('for'),
        tok('('),
        tok(TokenType.IDENT),
        tok('in'),
        parseExpression,
        tok(')'),
        parseStatement,
        ([_1, _2, variable, _3, iterable, _4, body], location) => new ForStatement(location, variable, iterable, body)
    );

    return { parseForStatement };
}
