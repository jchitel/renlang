import { ParseFunc, seq, tok } from '~/parser/parser';
import { TypeNode, NodeBase, SyntaxType } from '~/syntax/environment';


export interface ParenthesizedType extends NodeBase {
    syntaxType: SyntaxType.ParenthesizedType;
    inner: TypeNode;
}

export function register(TypeNode: ParseFunc<TypeNode>) {
    const ParenthesizedType: ParseFunc<ParenthesizedType> = seq(
        tok('('),
        TypeNode,
        tok(')'),
        ([_1, inner, _2], location) => ({
            syntaxType: SyntaxType.ParenthesizedType as SyntaxType.ParenthesizedType,
            location,
            inner
        })
    );

    return { ParenthesizedType };
}
