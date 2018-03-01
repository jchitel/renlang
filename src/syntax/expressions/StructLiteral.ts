import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';


interface StructEntry {
    key: Token;
    value: Expression;
}

export interface StructLiteral extends NodeBase {
    syntaxType: SyntaxType.StructLiteral;
    entries: ReadonlyArray<StructEntry>;
}

export function register(Expression: ParseFunc<Expression>) {
    const StructLiteral: ParseFunc<StructLiteral> = seq(
        tok('{'),
        repeat(seq(
            tok(TokenType.IDENT),
            tok(':'),
            Expression,
            ([key, _, value]) => ({ key, value })
        ), '*', tok(',')),
        tok('}'),
        ([_1, entries, _2], location) => ({
            syntaxType: SyntaxType.StructLiteral as SyntaxType.StructLiteral,
            location,
            entries
        })
    );

    return { StructLiteral };
}
