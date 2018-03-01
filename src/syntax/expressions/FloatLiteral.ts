import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface FloatLiteral extends NodeBase {
    syntaxType: SyntaxType.FloatLiteral;
    value: Token;
}

export const FloatLiteral: ParseFunc<FloatLiteral> = seq(
    tok(TokenType.FLOAT_LITERAL),
    (value, location) => ({
        syntaxType: SyntaxType.FloatLiteral as SyntaxType.FloatLiteral,
        location,
        value
    })
);
