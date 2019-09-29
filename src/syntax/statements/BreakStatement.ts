import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, optional } from '~/parser/parser';
import { FileRange } from '~/core';


export class BreakStatement extends NodeBase<SyntaxType.BreakStatement> {
    constructor(
        location: FileRange,
        readonly loopNumber: Optional<Token>
    ) { super(location, SyntaxType.BreakStatement) }

    accept<P, R = P>(visitor: BreakStatementVisitor<P, R>, param: P) {
        return visitor.visitBreakStatement(this, param);
    }
}

export interface BreakStatementVisitor<P, R = P> {
    visitBreakStatement(node: BreakStatement, param: P): R;
}

export const parseBreakStatement: ParseFunc<BreakStatement> = seq(
    tok('break'),
    optional(tok(TokenType.INTEGER_LITERAL)),
    ([_, loopNumber], location) => new BreakStatement(location, loopNumber)
);
