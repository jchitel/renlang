import { Type, NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';
import { FileRange } from '~/core';


interface Field {
    typeNode: Type;
    name: Token;
}

export class StructType extends NodeBase<SyntaxType.StructType> {
    constructor(
        location: FileRange,
        readonly fields: ReadonlyArray<Field>
    ) { super(location, SyntaxType.StructType) }

    accept<P, R = P>(visitor: StructTypeVisitor<P, R>, param: P) {
        return visitor.visitStructType(this, param);
    }
}

export interface StructTypeVisitor<P, R = P> {
    visitStructType(node: StructType, param: P): R;
}

export function register(parseType: ParseFunc<Type>) {
    const parseStructType: ParseFunc<StructType> = seq(
        tok('{'),
        repeat(seq(
            parseType,
            tok(TokenType.IDENT),
            ([typeNode, name]) => ({ typeNode, name })
        ), '*'),
        tok('}'),
        ([_1, fields, _2], location) => new StructType(location, fields)
    );

    return { parseStructType };
}
