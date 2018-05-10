import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, optional } from '~/parser/parser';
import { FileRange } from '~/core';


export class ContinueStatement extends NodeBase<SyntaxType.ContinueStatement> {
    constructor(
        location: FileRange,
        readonly loopNumber: Optional<Token>
    ) { super(location, SyntaxType.ContinueStatement) }

    accept<P, R = P>(visitor: ContinueStatementVisitor<P, R>, param: P) {
        return visitor.visitContinueStatement(this, param);
    }
}

export interface ContinueStatementVisitor<P, R = P> {
    visitContinueStatement(node: ContinueStatement, param: P): R;
}

export const parseContinueStatement: ParseFunc<ContinueStatement> = seq(
    tok('continue'),
    optional(tok(TokenType.INTEGER_LITERAL)),
    ([_, loopNumber], location) => new ContinueStatement(location, loopNumber)
);
