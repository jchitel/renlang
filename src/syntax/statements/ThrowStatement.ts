import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class ThrowStatement extends NodeBase<SyntaxType.ThrowStatement> {
    constructor(
        location: FileRange,
        readonly exp: Expression
    ) { super(location, SyntaxType.ThrowStatement) }

    accept<P, R = P>(visitor: ThrowStatementVisitor<P, R>, param: P) {
        return visitor.visitThrowStatement(this, param);
    }
}

export interface ThrowStatementVisitor<P, R = P> {
    visitThrowStatement(node: ThrowStatement, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseThrowStatement: ParseFunc<ThrowStatement> = seq(
        tok('throw'),
        parseExpression,
        ([_, exp], location) => new ThrowStatement(location, exp)
    );

    return { parseThrowStatement };
}
