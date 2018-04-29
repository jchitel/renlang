import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface CharLiteral extends NodeBase<SyntaxType.CharLiteral> {
    value: Token;
}

export const CharLiteral: ParseFunc<CharLiteral> = seq(
    tok(TokenType.CHARACTER_LITERAL),
    (value, location) => ({
        syntaxType: SyntaxType.CharLiteral as SyntaxType.CharLiteral,
        location,
        value
    })
);
