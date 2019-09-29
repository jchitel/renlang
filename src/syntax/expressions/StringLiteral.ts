import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class StringLiteral extends NodeBase<SyntaxType.StringLiteral> {
    constructor(
        location: FileRange,
        readonly value: Token
    ) { super(location, SyntaxType.StringLiteral) }

    accept<P, R = P>(visitor: StringLiteralVisitor<P, R>, param: P) {
        return visitor.visitStringLiteral(this, param);
    }
}

export interface StringLiteralVisitor<P, R = P> {
    visitStringLiteral(node: StringLiteral, param: P): R;
}

export const parseStringLiteral: ParseFunc<StringLiteral> = seq(
    tok(TokenType.STRING_LITERAL),
    (value, location) => new StringLiteral(location, value)
);
