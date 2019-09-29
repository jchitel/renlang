import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class CharLiteral extends NodeBase<SyntaxType.CharLiteral> {
    constructor(
        location: FileRange,
        readonly value: Token
    ) { super(location, SyntaxType.CharLiteral) }

    accept<P, R = P>(visitor: CharLiteralVisitor<P, R>, param: P) {
        return visitor.visitCharLiteral(this, param);
    }
}

export interface CharLiteralVisitor<P, R = P> {
    visitCharLiteral(node: CharLiteral, param: P): R;
}

export const parseCharLiteral: ParseFunc<CharLiteral> = seq(
    tok(TokenType.CHARACTER_LITERAL),
    (value, location) => new CharLiteral(location, value)
);
