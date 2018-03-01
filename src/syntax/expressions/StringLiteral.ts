import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface StringLiteral extends NodeBase {
    syntaxType: SyntaxType.StringLiteral;
    value: Token;
}

export const StringLiteral: ParseFunc<StringLiteral> = seq(
    tok(TokenType.STRING_LITERAL),
    (value, location) => ({
        syntaxType: SyntaxType.StringLiteral as SyntaxType.StringLiteral,
        location,
        value
    })
);
