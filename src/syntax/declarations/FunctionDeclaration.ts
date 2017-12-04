import { Token, TokenType } from '~/parser/Tokenizer';
import ASTNode from '~/syntax/ASTNode';
import INodeVisitor from '~/syntax/INodeVisitor';
import { parser, nonTerminal, exp, ParseResult } from '~/parser/Parser';
import { Declaration } from './Program';
import { TypeParamList, TypeParam } from './TypeDeclaration';
import { Statement } from '~/syntax/statements/Statement';
import { Block } from '~/syntax/statements/Block';
import { Expression } from '~/syntax/expressions/Expression';
import { Type } from '~/syntax/types/Type';


/**
 * Param ::= Type IDENT
 */
export class Param extends ASTNode {
    @parser(Type, { definite: true })
    setType(type: Type) {
        this.typeNode = type;
    }

    @parser(TokenType.IDENT, { err: 'INVALID_PARAMETER_NAME' })
    setName(name: Token) {
        this.name = name.image;
        this.registerLocation('name', name.getLocation());
    }

    name: string;
    typeNode: Type;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitParam(this);
    }

    prettyName() {
        return `${this.type} ${this.name}`;
    }
}

/**
 * ParameterList ::= LPAREN Param(* sep COMMA) RPAREN
 */
const ParameterList = {
    '(': exp(TokenType.LPAREN, { definite: true }),
    params: exp(Param, { repeat: '*', sep: TokenType.COMMA }),
    ')': exp(TokenType.RPAREN, { err: 'MISSING_CLOSE_PAREN' }),
};

/**
 * FunctionBody ::= Block | Expression | Statement
 * 
 * Put block before expression because there is a conflict
 * between empty blocks and empty structs.
 */
export const FunctionBody = [Block, Expression, Statement];

/**
 * FunctionDeclaration ::= 'func' Type IDENT TypeParamList? ParameterList FAT_ARROW FunctionBody
 */
@nonTerminal({ implements: Declaration })
export class FunctionDeclaration extends Declaration {
    @parser('func', { definite: true })
    setFuncToken(token: Token) {
        this.registerLocation('self', token.getLocation());
    }

    @parser(Type, { err: 'INVALID_RETURN_TYPE' })
    setReturnType(type: Type) {
        this.returnType = type;
    }

    @parser(TokenType.IDENT, { optional: true })
    setFunctionName(token: Token) {
        this.name = token.image;
        this.registerLocation('name', token.getLocation());
    }

    @parser(TypeParamList, { optional: true })
    setTypeParams(result: ParseResult) {
        this.typeParams = result.params as TypeParam[];
    }

    @parser(ParameterList, { err: 'INVALID_PARAMETER_LIST' })
    setParams(result: ParseResult) {
        this.params = result.params as Param[];
    }

    @parser(TokenType.FAT_ARROW, { err: 'INVALID_FAT_ARROW' }) setFatArrow() {}

    @parser(FunctionBody)
    setFunctionBody(body: Expression | Statement) {
        this.body = body;
        this.createAndRegisterLocation('self', this.locations.self, body.locations.self);
    }

    returnType: Type;
    name: string = '';
    typeParams: TypeParam[] = [];
    params: Param[];
    body: Expression | Statement;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitFunctionDeclaration(this);
    }

    prettyName() {
        return `${this.name}(${this.params.map(p => p.prettyName()).join(', ')})`;
    }
}