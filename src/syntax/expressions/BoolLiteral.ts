import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token } from '~/parser/lexer';
import { ParseFunc, seq, select, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class BoolLiteral extends NodeBase<SyntaxType.BoolLiteral> {
    constructor(
        location: FileRange,
        readonly value: Token
    ) { super(location, SyntaxType.BoolLiteral) }

    accept<P, R = P>(visitor: BoolLiteralVisitor<P, R>, param: P) {
        return visitor.visitBoolLiteral(this, param);
    }
}

export interface BoolLiteralVisitor<P, R = P> {
    visitBoolLiteral(node: BoolLiteral, param: P): R;
}

export const parseBoolLiteral: ParseFunc<BoolLiteral> = seq(
    select(tok('true'), tok('false')),
    (value, location) =>  new BoolLiteral(location, value)
);
