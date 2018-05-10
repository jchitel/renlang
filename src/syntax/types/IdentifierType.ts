import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { seq, tok, ParseFunc } from '~/parser/parser';
import { FileRange } from '~/core';


export class IdentifierType extends NodeBase<SyntaxType.IdentifierType> {
    constructor(
        location: FileRange,
        readonly name: Token
    ) { super(location, SyntaxType.IdentifierType) }

    accept<P, R = P>(visitor: IdentifierTypeVisitor<P, R>, param: P) {
        return visitor.visitIdentifierType(this, param);
    }
}

export interface IdentifierTypeVisitor<P, R = P> {
    visitIdentifierType(node: IdentifierType, param: P): R;
}

export const parseIdentifierType: ParseFunc<IdentifierType> = seq(
    tok(TokenType.IDENT),
    (name, location) => new IdentifierType(location, name)
);
