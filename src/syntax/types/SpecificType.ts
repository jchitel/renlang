import { NodeBase, SyntaxType, Type } from '~/syntax/environment';
import { ParseFunc, seq, repeat, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class SpecificType extends NodeBase<SyntaxType.SpecificType> {
    constructor(
        location: FileRange,
        readonly typeNode: Type,
        readonly typeArgs: ReadonlyArray<Type>
    ) { super(location, SyntaxType.SpecificType) }

    accept<P, R = P>(visitor: SpecificTypeVisitor<P, R>, param: P) {
        return visitor.visitSpecificType(this, param);
    }
}

export interface SpecificTypeVisitor<P, R = P> {
    visitSpecificType(node: SpecificType, param: P): R;
}

export class SpecificTypeSuffix extends NodeBase<SyntaxType.SpecificType> {
    constructor(
        location: FileRange,
        readonly typeArgs: ReadonlyArray<Type>
    ) { super(location, SyntaxType.SpecificType) }

    setBase = (typeNode: Type) => new SpecificType(this.location.merge(typeNode.location), typeNode, this.typeArgs);
}

export function register(parseType: ParseFunc<Type>) {
    const parseTypeArgList: ParseFunc<Type[]> = seq(
        tok('<'),
        repeat(parseType, '*', tok(',')),
        tok('>'),
        ([_1, types, _2]) => types
    );

    const parseSpecificTypeSuffix: ParseFunc<SpecificTypeSuffix> = seq(
        parseTypeArgList,
        (typeArgs, location) => new SpecificTypeSuffix(location, typeArgs)
    );

    return { parseSpecificTypeSuffix, parseTypeArgList };
}
