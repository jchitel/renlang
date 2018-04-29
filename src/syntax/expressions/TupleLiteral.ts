import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';


export interface TupleLiteral extends NodeBase<SyntaxType.TupleLiteral> {
    items: ReadonlyArray<Expression>;
}

export function register(Expression: ParseFunc<Expression>) {
    const TupleLiteral: ParseFunc<TupleLiteral> = seq(
        tok('('),
        repeat(Expression, '*', tok(',')),
        tok(')'),
        ([_1, items, _2], location) => ({
            syntaxType: SyntaxType.TupleLiteral as SyntaxType.TupleLiteral,
            location,
            items
        })
    );

    return { TupleLiteral };
}
