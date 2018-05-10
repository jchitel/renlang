import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class FieldAccess extends NodeBase<SyntaxType.FieldAccess> {
    constructor(
        location: FileRange,
        readonly target: Expression,
        readonly field: Token
    ) { super(location, SyntaxType.FieldAccess) }

    accept<P, R = P>(visitor: FieldAccessVisitor<P, R>, param: P) {
        return visitor.visitFieldAccess(this, param);
    }
}

export interface FieldAccessVisitor<P, R = P> {
    visitFieldAccess(node: FieldAccess, param: P): R;
}

export class FieldAccessSuffix extends NodeBase<SyntaxType.FieldAccess> {
    constructor(
        location: FileRange,
        readonly field: Token
    ) { super(location, SyntaxType.FieldAccess) }

    setBase = (target: Expression) => new FieldAccess(this.location.merge(target.location), target, this.field);
}

export const parseFieldAccessSuffix: ParseFunc<FieldAccessSuffix> = seq(
    tok('.'),
    tok(TokenType.IDENT),
    ([_, field], location) => new FieldAccessSuffix(location, field)
);
