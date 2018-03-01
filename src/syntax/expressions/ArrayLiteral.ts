import { SyntaxType, Expression, NodeBase } from '~/syntax/environment';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';


export interface ArrayLiteral extends NodeBase {
    syntaxType: SyntaxType.ArrayLiteral;
    items: ReadonlyArray<Expression>;
}

export function register(Expression: ParseFunc<Expression>) {
    const ArrayLiteral: ParseFunc<ArrayLiteral> = seq(
        tok('['),
        repeat(Expression, '*', tok(',')),
        tok(']'),
        ([_1, items, _2], location) => ({
            syntaxType: SyntaxType.ArrayLiteral as SyntaxType.ArrayLiteral,
            location,
            items
        })
    );

    return { ArrayLiteral };
}
