import { ParseFunc, seq, tok } from '~/parser/parser';
import { Type, NodeBase, SyntaxType } from '~/syntax/environment';
import { FileRange } from '~/core';


export class ParenthesizedType extends NodeBase<SyntaxType.ParenthesizedType> {
    constructor(
        location: FileRange,
        readonly inner: Type
    ) { super(location, SyntaxType.ParenthesizedType) }

    accept<P, R = P>(visitor: ParenthesizedTypeVisitor<P, R>, param: P) {
        return visitor.visitParenthesizedType(this, param);
    }
}

export interface ParenthesizedTypeVisitor<P, R = P> {
    visitParenthesizedType(node: ParenthesizedType, param: P): R;
}

export function register(parseTypeNode: ParseFunc<Type>) {
    const parseParenthesizedType: ParseFunc<ParenthesizedType> = seq(
        tok('('),
        parseTypeNode,
        tok(')'),
        ([_1, inner, _2], location) => new ParenthesizedType(location, inner)
    );

    return { parseParenthesizedType };
}
