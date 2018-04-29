import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface IntegerLiteral extends NodeBase<SyntaxType.IntegerLiteral> {
    value: Token;
}

export const IntegerLiteral: ParseFunc<IntegerLiteral> = seq(
    tok(TokenType.INTEGER_LITERAL),
    (value, location) => ({
        syntaxType: SyntaxType.IntegerLiteral as SyntaxType.IntegerLiteral,
        location,
        value
    })
);
