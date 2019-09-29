import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class IntegerLiteral extends NodeBase<SyntaxType.IntegerLiteral> {
    constructor(
        location: FileRange,
        readonly value: Token
    ) { super(location, SyntaxType.IntegerLiteral) }

    accept<P, R = P>(visitor: IntegerLiteralVisitor<P, R>, param: P) {
        return visitor.visitIntegerLiteral(this, param);
    }
}

export interface IntegerLiteralVisitor<P, R = P> {
    visitIntegerLiteral(node: IntegerLiteral, param: P): R;
}

export const parseIntegerLiteral: ParseFunc<IntegerLiteral> = seq(
    tok(TokenType.INTEGER_LITERAL),
    (value, location) => new IntegerLiteral(location, value)
);
