import { NodeBase, SyntaxType, Statement, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class DoWhileStatement extends NodeBase<SyntaxType.DoWhileStatement> {
    constructor(
        location: FileRange,
        readonly body: Statement,
        readonly condition: Expression
    ) { super(location, SyntaxType.DoWhileStatement) }

    accept<P, R = P>(visitor: DoWhileStatementVisitor<P, R>, param: P) {
        return visitor.visitDoWhileStatement(this, param);
    }
}

export interface DoWhileStatementVisitor<P, R = P> {
    visitDoWhileStatement(node: DoWhileStatement, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>, parseStatement: ParseFunc<Statement>) {
    const parseDoWhileStatement: ParseFunc<DoWhileStatement> = seq(
        tok('do'),
        parseStatement,
        tok('while'),
        tok('('),
        parseExpression,
        tok(')'),
        ([_1, body, _2, _3, condition, _4], location) => new DoWhileStatement(location, body, condition)
    );

    return { parseDoWhileStatement };
}
