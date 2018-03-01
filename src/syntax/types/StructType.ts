import { TypeNode, NodeBase, SyntaxType } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';



interface Field {
    typeNode: TypeNode;
    name: Token;
}

export interface StructType extends NodeBase {
    syntaxType: SyntaxType.StructType;
    fields: ReadonlyArray<Field>;
}

export function register(TypeNode: ParseFunc<TypeNode>) {
    const StructType: ParseFunc<StructType> = seq(
        tok('{'),
        repeat(seq(
            TypeNode,
            tok(TokenType.IDENT),
            ([typeNode, name]) => ({ typeNode, name })
        ), '*'),
        tok('}'),
        ([_1, fields, _2], location) => ({
            syntaxType: SyntaxType.StructType as SyntaxType.StructType,
            location,
            fields
        })
    );

    return { StructType };
}
