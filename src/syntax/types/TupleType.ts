import { NodeBase, SyntaxType, TypeNode } from '~/syntax/environment';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';



export interface TupleType extends NodeBase {
    syntaxType: SyntaxType.TupleType;
    types: ReadonlyArray<TypeNode>;
}

export function register(TypeNode: ParseFunc<TypeNode>) {
    const TupleType: ParseFunc<TupleType> = seq(
        tok('('),
        repeat(TypeNode, '*', tok(',')),
        tok(')'),
        ([_1, types, _2], location) => ({
            syntaxType: SyntaxType.TupleType as SyntaxType.TupleType,
            location,
            types
        })
    );

    return { TupleType };
}
