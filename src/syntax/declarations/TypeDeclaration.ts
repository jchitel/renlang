import { Type, SyntaxType, NodeBase } from '~/syntax/environment';
import { ParseFunc, seq, optional, select, tok, repeat } from '~/parser/parser';
import { TokenType, Token } from '~/parser/lexer';
import { FileRange } from '~/core';


export class TypeParam extends NodeBase<SyntaxType.TypeParam> {
    constructor(
        location: FileRange,
        readonly name: Token,
        readonly varianceOp: Optional<Token>,
        readonly typeConstraint: Optional<Type>
    ) { super(location, SyntaxType.TypeParam) }

    accept<T, R = T>(visitor: TypeParamVisitor<T, R>, param: T): R {
        return visitor.visitTypeParam(this, param);
    }
}

export interface TypeParamVisitor<T, R = T> {
    visitTypeParam(node: TypeParam, param: T): R;
}

export interface TypeParamList {
    readonly params: ReadonlyArray<TypeParam>;
}

export class TypeDeclaration extends NodeBase<SyntaxType.TypeDeclaration> {
    constructor(
        location: FileRange,
        readonly name: Token,
        readonly typeParams: ReadonlyArray<TypeParam>,
        readonly typeNode: Type
    ) { super(location, SyntaxType.TypeDeclaration) }

    accept<T, R = T>(visitor: TypeDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitTypeDeclaration(this, param);
    }
}

export interface TypeDeclarationVisitor<T, R = T> {
    visitTypeDeclaration(node: TypeDeclaration, param: T): R;
}

export class AnonymousTypeDeclaration extends NodeBase<SyntaxType.AnonymousTypeDeclaration> {
    constructor(
        location: FileRange,
        readonly typeParams: ReadonlyArray<TypeParam>,
        readonly typeNode: Type
    ) { super(location, SyntaxType.AnonymousTypeDeclaration) }

    accept<T, R = T>(visitor: AnonymousTypeDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitAnonymousTypeDeclaration(this, param);
    }
}

export interface AnonymousTypeDeclarationVisitor<T, R = T> {
    visitAnonymousTypeDeclaration(node: AnonymousTypeDeclaration, param: T): R;
}

/**
 * Registration function to handle circular dependency.
 */
export function register(parseType: ParseFunc<Type>) {
    /**
     * TypeParam = ('+' | '-')? IDENT (':' TypeNode)?
     */
    const parseTypeParam: ParseFunc<TypeParam> = seq(
        optional(select(tok('+'), tok('-'))),
        tok(TokenType.IDENT),
        optional(seq(
            tok(':'),
            parseType,
            (([_, type]) => type)
        )),
        ([varianceOp, name, typeConstraint], location) => new TypeParam(location, name, varianceOp, typeConstraint)
    );

    const parseTypeParamList: ParseFunc<TypeParamList> = seq(
        tok('<'),
        repeat(parseTypeParam, '+', tok(',')),
        tok('>'),
        ([_1, params, _2]) => ({ params })
    );

    /**
     * TypeDeclaration ::= 'type' IDENT TypeParamList? EQUALS Type
     */
    const parseTypeDeclaration: ParseFunc<TypeDeclaration> = seq(
        tok('type'),
        tok(TokenType.IDENT),
        optional(parseTypeParamList),
        tok('='),
        parseType,
        ([_1, name, params, _2, typeNode], location) => new TypeDeclaration(location, name, params ? params.params : [], typeNode)
    );

    /**
     * AnonymousTypeDeclaration ::= 'type' TypeParamList? EQUALS Type
     */
    const parseAnonymousTypeDeclaration: ParseFunc<AnonymousTypeDeclaration> = seq(
        tok('type'),
        optional(parseTypeParamList),
        tok('='),
        parseType,
        ([_1, params, _2, typeNode], location) => new AnonymousTypeDeclaration(location, params ? params.params : [], typeNode)
    );

    return {
        parseTypeParam,
        parseTypeParamList,
        parseTypeDeclaration,
        parseAnonymousTypeDeclaration
    }
}
