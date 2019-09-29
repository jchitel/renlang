import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class ArrayAccess extends NodeBase<SyntaxType.ArrayAccess> {
    constructor(
        location: FileRange,
        readonly target: Expression,
        readonly index: Expression
    ) { super(location, SyntaxType.ArrayAccess) }

    accept<P, R = P>(visitor: ArrayAccessVisitor<P, R>, param: P) {
        return visitor.visitArrayAccess(this, param);
    }
}

export interface ArrayAccessVisitor<P, R = P> {
    visitArrayAccess(node: ArrayAccess, param: P): R;
}

export class ArrayAccessSuffix extends NodeBase<SyntaxType.ArrayAccess> {
    constructor(
        location: FileRange,
        readonly index: Expression
    ) { super(location, SyntaxType.ArrayAccess) }

    setBase = (target: Expression) => new ArrayAccess(this.location, target, this.index);
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseArrayAccessSuffix: ParseFunc<ArrayAccessSuffix> = seq(
        tok('['),
        parseExpression,
        tok(']'),
        ([_1, index, _2], location) => new ArrayAccessSuffix(location, index)
    );

    return { parseArrayAccessSuffix };
}
