import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';
import { FileRange } from '~/core';


interface StructEntry {
    key: Token;
    value: Expression;
}

export class StructLiteral extends NodeBase<SyntaxType.StructLiteral> {
    constructor(
        location: FileRange,
        readonly entries: ReadonlyArray<StructEntry>
    ) { super(location, SyntaxType.StructLiteral) }

    accept<P, R = P>(visitor: StructLiteralVisitor<P, R>, param: P) {
        return visitor.visitStructLiteral(this, param);
    }
}

export interface StructLiteralVisitor<P, R = P> {
    visitStructLiteral(node: StructLiteral, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseStructLiteral: ParseFunc<StructLiteral> = seq(
        tok('{'),
        repeat(seq(
            tok(TokenType.IDENT),
            tok(':'),
            parseExpression,
            ([key, _, value]) => ({ key, value })
        ), '*', tok(',')),
        tok('}'),
        ([_1, entries, _2], location) => new StructLiteral(location, entries)
    );

    return { parseStructLiteral };
}
