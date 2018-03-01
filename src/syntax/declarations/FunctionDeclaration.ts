import { TypeParamList, TypeParam } from './TypeDeclaration';
import { ParseFunc, seq, tok, repeat, select, optional } from '~/parser/parser';
import { TypeNode, Expression, NodeBase, SyntaxType, Statement } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { Block } from '~/syntax';


export interface Param extends NodeBase {
    readonly syntaxType: SyntaxType.Param;
    readonly name: Token;
    readonly typeNode: Optional<TypeNode>; // optional to support lambda params
}

export interface FunctionDeclaration extends NodeBase {
    readonly syntaxType: SyntaxType.FunctionDeclaration;
    readonly returnType: TypeNode;
    readonly name: Optional<Token>;
    readonly typeParams: ReadonlyArray<TypeParam>;
    readonly params: ReadonlyArray<Param>;
    readonly body: Expression | Statement;
}

export function register(
    TypeNode: ParseFunc<TypeNode>,
    Expression: ParseFunc<Expression>,
    Statement: ParseFunc<Statement>,
    Block: ParseFunc<Block>,
    TypeParamList: ParseFunc<TypeParamList>
) {
    /**
     * Param ::= Type IDENT
     */
    const Param: ParseFunc<Param> = seq(
        TypeNode,
        tok(TokenType.IDENT),
        ([typeNode, name], location) => ({
            syntaxType: SyntaxType.Param as SyntaxType.Param,
            location,
            typeNode,
            name
        })
    );

    /**
     * ParameterList ::= LPAREN Param(* sep COMMA) RPAREN
     */
    const ParamList: ParseFunc<Param[]> = seq(
        tok('('),
        repeat(Param, '*', tok(',')),
        tok(')'),
        ([_1, params, _2]) => params
    );

    /**
     * FunctionBody ::= Block | Expression | Statement
     * 
     * Put block before expression because there is a conflict
     * between empty blocks and empty structs.
     */
    const FunctionBody: ParseFunc<Expression | Statement> = select<Expression | Statement>(
        Block,
        Expression,
        Statement
    );

    /**
     * FunctionDeclaration ::= 'func' Type IDENT? TypeParamList? ParamList FAT_ARROW FunctionBody
     */
    const FunctionDeclaration: ParseFunc<FunctionDeclaration> = seq(
        tok('func'),
        TypeNode,
        optional(tok(TokenType.IDENT)),
        optional(TypeParamList),
        ParamList,
        tok('=>'),
        FunctionBody,
        ([_1, returnType, name, typeParams, params, _2, body], location) => ({
            syntaxType: SyntaxType.FunctionDeclaration as SyntaxType.FunctionDeclaration,
            location,
            name,
            returnType,
            typeParams: typeParams ? typeParams.params : [],
            params,
            body
        })
    );

    return {
        FunctionDeclaration,
        Param,
        FunctionBody
    };
}
