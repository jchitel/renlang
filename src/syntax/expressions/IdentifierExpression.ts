import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class IdentifierExpression extends NodeBase<SyntaxType.IdentifierExpression> {
    constructor(
        location: FileRange,
        readonly name: Token
    ) { super(location, SyntaxType.IdentifierExpression) }

    accept<P, R = P>(visitor: IdentifierExpressionVisitor<P, R>, param: P) {
        return visitor.visitIdentifierExpression(this, param);
    }
}

export interface IdentifierExpressionVisitor<P, R = P> {
    visitIdentifierExpression(node: IdentifierExpression, param: P): R;
}

export const parseIdentifierExpression: ParseFunc<IdentifierExpression> = seq(
    tok(TokenType.IDENT),
    (name, location) => new IdentifierExpression(location, name)
);
