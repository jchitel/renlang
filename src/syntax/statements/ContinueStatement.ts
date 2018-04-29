import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, optional } from '~/parser/parser';


export interface ContinueStatement extends NodeBase<SyntaxType.ContinueStatement> {
    loopNumber: Optional<Token>;
}

export const ContinueStatement: ParseFunc<ContinueStatement> = seq(
    tok('continue'),
    optional(tok(TokenType.INTEGER_LITERAL)),
    ([_, loopNumber], location) => ({
        syntaxType: SyntaxType.ContinueStatement as SyntaxType.ContinueStatement,
        location,
        loopNumber
    })
);
