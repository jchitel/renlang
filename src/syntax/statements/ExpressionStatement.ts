import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq } from '~/parser/parser';
import { FileRange } from '~/core';


export class ExpressionStatement extends NodeBase<SyntaxType.ExpressionStatement> {
    constructor(
        location: FileRange,
        readonly expression: Expression
    ) { super(location, SyntaxType.ExpressionStatement) }

    accept<P, R = P>(visitor: ExpressionStatementVisitor<P, R>, param: P) {
        return visitor.visitExpressionStatement(this, param);
    }
}

export interface ExpressionStatementVisitor<P, R = P> {
    visitExpressionStatement(node: ExpressionStatement, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseExpressionStatement: ParseFunc<ExpressionStatement> = seq(
        parseExpression,
        (expression, location) => new ExpressionStatement(location, expression)
    );

    return { parseExpressionStatement };
}
