import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class FloatLiteral extends NodeBase<SyntaxType.FloatLiteral> {
    constructor(
        location: FileRange,
        readonly value: Token
    ) { super(location, SyntaxType.FloatLiteral) }

    accept<P, R = P>(visitor: FloatLiteralVisitor<P, R>, param: P) {
        return visitor.visitFloatLiteral(this, param);
    }
}

export interface FloatLiteralVisitor<P, R = P> {
    visitFloatLiteral(node: FloatLiteral, param: P): R;
}

export const parseFloatLiteral: ParseFunc<FloatLiteral> = seq(
    tok(TokenType.FLOAT_LITERAL),
    (value, location) => new FloatLiteral(location, value)
);
