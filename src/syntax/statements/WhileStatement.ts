import { NodeBase, SyntaxType, Expression, Statement } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class WhileStatement extends NodeBase<SyntaxType.WhileStatement> {
    constructor(
        location: FileRange,
        readonly condition: Expression,
        readonly body: Statement
    ) { super(location, SyntaxType.WhileStatement) }

    accept<P, R = P>(visitor: WhileStatementVisitor<P, R>, param: P) {
        return visitor.visitWhileStatement(this, param);
    }
}

export interface WhileStatementVisitor<P, R = P> {
    visitWhileStatement(node: WhileStatement, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>, parseStatement: ParseFunc<Statement>) {
    const parseWhileStatement: ParseFunc<WhileStatement> = seq(
        tok('while'),
        tok('('),
        parseExpression,
        tok(')'),
        parseStatement,
        ([_1, _2, condition, _3, body], location) => new WhileStatement(location, condition, body)
    );

    return { parseWhileStatement };
}
