import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok, optional } from '~/parser/parser';
import { FileRange } from '~/core';


export class ReturnStatement extends NodeBase<SyntaxType.ReturnStatement> {
    constructor(
        location: FileRange,
        readonly exp: Optional<Expression>
    ) { super(location, SyntaxType.ReturnStatement) }

    accept<P, R = P>(visitor: ReturnStatementVisitor<P, R>, param: P) {
        return visitor.visitReturnStatement(this, param);
    }
}

export interface ReturnStatementVisitor<P, R = P> {
    visitReturnStatement(node: ReturnStatement, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseReturnStatement: ParseFunc<ReturnStatement> = seq(
        tok('return'),
        optional(parseExpression),
        ([_, exp], location) => new ReturnStatement(location, exp)
    );

    return { parseReturnStatement };
}
