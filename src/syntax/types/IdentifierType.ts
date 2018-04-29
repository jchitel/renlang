import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { seq, tok, ParseFunc } from '~/parser/parser';



export interface IdentifierType extends NodeBase<SyntaxType.IdentifierType> {
    name: Token;
}

export const IdentifierType: ParseFunc<IdentifierType> = seq(
    tok(TokenType.IDENT),
    (name, location) => ({
        syntaxType: SyntaxType.IdentifierType as SyntaxType.IdentifierType,
        location,
        name
    })
);
