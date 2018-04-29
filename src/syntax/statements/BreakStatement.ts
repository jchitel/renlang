import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, optional } from '~/parser/parser';


export interface BreakStatement extends NodeBase<SyntaxType.BreakStatement> {
    loopNumber: Optional<Token>;
}

export const BreakStatement: ParseFunc<BreakStatement> = seq(
    tok('break'),
    optional(tok(TokenType.INTEGER_LITERAL)),
    ([_, loopNumber], location) => ({
        syntaxType: SyntaxType.BreakStatement as SyntaxType.BreakStatement,
        location,
        loopNumber
    })
);
