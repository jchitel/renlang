import { TypeNode, SyntaxType, NodeBase } from '~/syntax/environment';
import { ParseFunc, seq, optional, select, tok, repeat } from '~/parser/parser';
import { TokenType, Token } from '~/parser/lexer';


export interface TypeParam extends NodeBase<SyntaxType.TypeParam> {
    readonly name: Token;
    readonly varianceOp: Optional<Token>;
    readonly typeConstraint: Optional<TypeNode>;
}

export interface TypeParamList {
    readonly params: ReadonlyArray<TypeParam>;
}

export interface TypeDeclaration extends NodeBase<SyntaxType.TypeDeclaration> {
    readonly name: Optional<Token>;
    readonly typeParams: ReadonlyArray<TypeParam>;
    readonly typeNode: TypeNode;
}

/**
 * Registration function to handle circular dependency.
 */
export function register(TypeNode: ParseFunc<TypeNode>) {
    /**
     * TypeParam = ('+' | '-')? IDENT (':' TypeNode)?
     */
    const TypeParam: ParseFunc<TypeParam> = seq(
        optional(select(tok('+'), tok('-'))),
        tok(TokenType.IDENT),
        optional(seq(
            tok(':'),
            TypeNode,
            (([_, type]) => type)
        )),
        ([varianceOp, name, typeConstraint], location) => ({
            syntaxType: SyntaxType.TypeParam as SyntaxType.TypeParam,
            location,
            name,
            varianceOp,
            typeConstraint
        })
    );

    const TypeParamList: ParseFunc<TypeParamList> = seq(
        tok('<'),
        repeat(TypeParam, '+', tok(',')),
        tok('>'),
        ([_1, params, _2]) => ({ params })
    );

    /**
     * TypeDeclaration ::= 'type' IDENT? TypeParamList? EQUALS Type
     */
    const TypeDeclaration: ParseFunc<TypeDeclaration> = seq(
        tok('type'),
        optional(tok(TokenType.IDENT)),
        optional(TypeParamList),
        tok('='),
        TypeNode,
        ([_1, name, params, _2, typeNode], location) => ({
            syntaxType: SyntaxType.TypeDeclaration as SyntaxType.TypeDeclaration,
            location,
            name,
            typeParams: params ? params.params : [],
            typeNode
        })
    );

    return {
        TypeParam,
        TypeParamList,
        TypeDeclaration
    }
}
