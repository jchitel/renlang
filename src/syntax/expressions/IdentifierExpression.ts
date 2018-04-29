import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface IdentifierExpression extends NodeBase<SyntaxType.IdentifierExpression> {
    name: Token;
}

export const IdentifierExpression: ParseFunc<IdentifierExpression> = seq(
    tok(TokenType.IDENT),
    (name, location) => ({
        syntaxType: SyntaxType.IdentifierExpression as SyntaxType.IdentifierExpression,
        location,
        name
    })
);
