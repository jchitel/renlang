import { NodeBase, SyntaxType, Type } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class UnionType extends NodeBase<SyntaxType.UnionType> {
    constructor(
        location: FileRange,
        readonly left: Type,
        readonly right: Type
    ) { super(location, SyntaxType.UnionType) }

    accept<P, R = P>(visitor: UnionTypeVisitor<P, R>, param: P) {
        return visitor.visitUnionType(this, param);
    }
}

export interface UnionTypeVisitor<P, R = P> {
    visitUnionType(node: UnionType, param: P): R;
}

export class UnionTypeSuffix extends NodeBase<SyntaxType.UnionType> {
    constructor(
        location: FileRange,
        readonly right: Type
    ) { super(location, SyntaxType.UnionType) }

    setBase = (left: Type) => new UnionType(this.location.merge(left.location), left, this.right)
}

export function register(parseType: ParseFunc<Type>) {
    const parseUnionTypeSuffix: ParseFunc<UnionTypeSuffix> = seq(
        tok('|'),
        parseType,
        ([_1, right], location) => new UnionTypeSuffix(location, right)
    );

    return { parseUnionTypeSuffix };
}
