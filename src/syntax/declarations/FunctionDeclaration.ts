import { TypeParamList, TypeParam } from './TypeDeclaration';
import { ParseFunc, seq, tok, repeat, select, optional } from '~/parser/parser';
import { Type, Expression, NodeBase, SyntaxType, Statement } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { Block } from '~/syntax';
import { FileRange } from '~/core';


export class Param extends NodeBase<SyntaxType.Param> {
    constructor(
        location: FileRange,
        readonly name: Token,
        readonly typeNode: Optional<Type> // optional to support lambda params
    ) { super(location, SyntaxType.Param) }

    accept<T, R = T>(visitor: ParamVisitor<T, R>, param: T): R {
        return visitor.visitParam(this, param);
    }
}

export interface ParamVisitor<T, R = T> {
    visitParam(node: Param, param: T): R;
}

export class FunctionDeclaration extends NodeBase<SyntaxType.FunctionDeclaration> {
    constructor(
        location: FileRange,
        readonly returnType: Type,
        readonly name: Token,
        readonly typeParams: ReadonlyArray<TypeParam>,
        readonly params: ReadonlyArray<Param>,
        readonly body: Expression | Statement
    ) { super(location, SyntaxType.FunctionDeclaration) }

    accept<T, R = T>(visitor: FunctionDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitFunctionDeclaration(this, param);
    }
}

export interface FunctionDeclarationVisitor<T, R = T> {
    visitFunctionDeclaration(node: FunctionDeclaration, param: T): R;
}

export class AnonymousFunctionDeclaration extends NodeBase<SyntaxType.AnonymousFunctionDeclaration> {
    constructor(
        location: FileRange,
        readonly returnType: Type,
        readonly typeParams: ReadonlyArray<TypeParam>,
        readonly params: ReadonlyArray<Param>,
        readonly body: Expression | Statement
    ) { super(location, SyntaxType.AnonymousFunctionDeclaration) }

    accept<T, R = T>(visitor: AnonymousFunctionDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitAnonymousFunctionDeclaration(this, param);
    }
}

export interface AnonymousFunctionDeclarationVisitor<T, R = T> {
    visitAnonymousFunctionDeclaration(node: AnonymousFunctionDeclaration, param: T): R;
}

export function register(
    parseType: ParseFunc<Type>,
    parseExpression: ParseFunc<Expression>,
    parseStatement: ParseFunc<Statement>,
    parseBlock: ParseFunc<Block>,
    parseTypeParamList: ParseFunc<TypeParamList>
) {
    /**
     * Param ::= Type IDENT
     */
    const parseParam: ParseFunc<Param> = seq(
        parseType,
        tok(TokenType.IDENT),
        ([typeNode, name], location) => new Param(location, name, typeNode)
    );

    /**
     * ParameterList ::= LPAREN Param(* sep COMMA) RPAREN
     */
    const parseParamList: ParseFunc<Param[]> = seq(
        tok('('),
        repeat(parseParam, '*', tok(',')),
        tok(')'),
        ([_1, params, _2]) => params
    );

    /**
     * FunctionBody ::= Block | Expression | Statement
     * 
     * Put block before expression because there is a conflict
     * between empty blocks and empty structs.
     */
    const parseFunctionBody: ParseFunc<Expression | Statement> = select<Expression | Statement>(
        parseBlock,
        parseExpression,
        parseStatement
    );

    /**
     * FunctionDeclaration ::= 'func' Type IDENT TypeParamList? ParamList FAT_ARROW FunctionBody
     */
    const parseFunctionDeclaration: ParseFunc<FunctionDeclaration> = seq(
        tok('func'),
        parseType,
        tok(TokenType.IDENT),
        optional(parseTypeParamList),
        parseParamList,
        tok('=>'),
        parseFunctionBody,
        ([_1, returnType, name, typeParams, params, _2, body], location) => new FunctionDeclaration(
            location,
            returnType,
            name,
            typeParams ? typeParams.params : [],
            params,
            body
        )
    );

    /**
     * AnonymousFunctionDeclaration ::= 'func' Type TypeParamList? ParamList FAT_ARROW FunctionBody
     */
    const parseAnonymousFunctionDeclaration: ParseFunc<AnonymousFunctionDeclaration> = seq(
        tok('func'),
        parseType,
        optional(parseTypeParamList),
        parseParamList,
        tok('=>'),
        parseFunctionBody,
        ([_1, returnType, typeParams, params, _2, body], location) => new AnonymousFunctionDeclaration(
            location,
            returnType,
            typeParams ? typeParams.params : [],
            params,
            body
        )
    );

    return {
        parseFunctionDeclaration,
        parseAnonymousFunctionDeclaration,
        parseParam,
        parseFunctionBody
    };
}
