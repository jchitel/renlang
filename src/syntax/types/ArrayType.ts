import { NodeBase, SyntaxType, Type } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class ArrayType extends NodeBase<SyntaxType.ArrayType> {
    constructor(
        location: FileRange,
        readonly baseType: Type
    ) { super(location, SyntaxType.ArrayType) }

    accept<P, R = P>(visitor: ArrayTypeVisitor<P, R>, param: P) {
        return visitor.visitArrayType(this, param);
    }
}

export interface ArrayTypeVisitor<P, R = P> {
    visitArrayType(node: ArrayType, param: P): R;
}

export class ArrayTypeSuffix extends NodeBase<SyntaxType.ArrayType> {
    constructor(location: FileRange) { super(location, SyntaxType.ArrayType) }

    setBase = (baseType: Type) => new ArrayType(this.location.merge(baseType.location), baseType);
}

export const parseArrayTypeSuffix: ParseFunc<ArrayTypeSuffix> = seq(
    tok('['),
    tok(']'),
    ([_1, _2], location) => new ArrayTypeSuffix(location)
);
