import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token } from '~/parser/lexer';
import { ParseFunc, seq, select, tok } from '~/parser/parser';


export interface BoolLiteral extends NodeBase<SyntaxType.BoolLiteral> {
    value: Token;
}

export const BoolLiteral: ParseFunc<BoolLiteral> = seq(
    select(tok('true'), tok('false')),
    (value, location) => ({
        syntaxType: SyntaxType.BoolLiteral as SyntaxType.BoolLiteral,
        location,
        value
    })
);
