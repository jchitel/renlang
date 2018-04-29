import { NodeBase, SyntaxType, TypeNode } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface NamespaceAccessType extends NodeBase<SyntaxType.NamespaceAccessType> {
    baseType: TypeNode;
    typeName: Token;
}

export interface NamespaceAccessTypeSuffix extends NodeBase<SyntaxType.NamespaceAccessType> {
    typeName: Token;
    setBase(baseType: TypeNode): NamespaceAccessType;
}

export const NamespaceAccessTypeSuffix: ParseFunc<NamespaceAccessTypeSuffix> = seq(
    tok('.'),
    tok(TokenType.IDENT),
    ([_1, typeName], location) => ({
        syntaxType: SyntaxType.NamespaceAccessType as SyntaxType.NamespaceAccessType,
        location,
        typeName,
        setBase(baseType: TypeNode) {
            return {
                ...this, 
                baseType,
                location: this.location.merge(baseType.location)
            }
        }
    })
);
