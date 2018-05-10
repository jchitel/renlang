import { NodeBase, SyntaxType, Type } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class NamespaceAccessType extends NodeBase<SyntaxType.NamespaceAccessType> {
    constructor(
        location: FileRange,
        readonly baseType: Type,
        readonly typeName: Token
    ) { super(location, SyntaxType.NamespaceAccessType) }

    accept<P, R = P>(visitor: NamespaceAccessTypeVisitor<P, R>, param: P) {
        return visitor.visitNamespaceAccessType(this, param);
    }
}

export interface NamespaceAccessTypeVisitor<P, R = P> {
    visitNamespaceAccessType(node: NamespaceAccessType, param: P): R;
}

export class NamespaceAccessTypeSuffix extends NodeBase<SyntaxType.NamespaceAccessType> {
    constructor(
        location: FileRange,
        readonly typeName: Token
    ) { super(location, SyntaxType.NamespaceAccessType) }

    setBase = (baseType: Type) => new NamespaceAccessType(this.location.merge(baseType.location), baseType, this.typeName);
}

export const parseNamespaceAccessTypeSuffix: ParseFunc<NamespaceAccessTypeSuffix> = seq(
    tok('.'),
    tok(TokenType.IDENT),
    ([_1, typeName], location) => new NamespaceAccessTypeSuffix(location, typeName)
);
