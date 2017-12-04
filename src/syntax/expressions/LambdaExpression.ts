import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TFunction } from '~/typecheck/types';
import ASTNode from '~/syntax/ASTNode';
import { TokenType, Token } from '~/parser/Tokenizer';
import { ParenthesizedExpression } from '~/syntax/expressions/ParenthesizedExpression';
import { TupleLiteral } from '~/syntax/expressions/TupleLiteral';
import { Param, FunctionBody } from '~/syntax/declarations/FunctionDeclaration';
import { Statement } from '~/syntax/statements/Statement';
import { IdentifierExpression } from '~/syntax/expressions/IdentifierExpression';


export class LambdaParam extends ASTNode {
    @parser(TokenType.IDENT, { definite: true })
    setName(token: Token) {
        this.name = token.image;
        this.registerLocation('name', token.getLocation());
    }

    name: string;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitLambdaParam(this);
    }

    prettyName() {
        return this.name;
    }
}

export abstract class BaseLambdaExpression extends Expression {
    params: (Param | LambdaParam)[];
    body: Expression | Statement;
    type: TFunction;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitLambdaExpression(this);
    }

    prettyName() {
        return `<lambda>(${this.params.map(p => p.prettyName()).join(', ')})`;
    }
}

/**
 * LambdaExpression ::= LPAREN (Param | LambdaParam)(* sep COMMA) RPAREN FAT_ARROW FunctionBody
 */
@nonTerminal({ implements: Expression, before: [ParenthesizedExpression, TupleLiteral] })
export class LambdaExpression extends BaseLambdaExpression {
    @parser(TokenType.LPAREN)
    setOpenParenToken(token: Token) {
        this.registerLocation('openParen', token.getLocation());
    }

    @parser([Param, LambdaParam], { repeat: '*', sep: TokenType.COMMA })
    setParams(params: (Param | LambdaParam)[]) {
        this.params = params;
    }

    @parser(TokenType.RPAREN) setCloseParen() {}
    @parser(TokenType.FAT_ARROW, { definite: true }) setFatArrow() {}

    @parser(FunctionBody, { err: 'INVALID_FUNCTION_BODY' })
    setBody(body: Statement | Expression) {
        this.body = body;
        this.createAndRegisterLocation('self', this.locations.openParen, body.locations.self);
    }
}

/**
 * ShorthandLambdaExpression ::= IDENT FAT_ARROW FunctionBody
 * 
 * This is a special version that only applies when you have a single
 * parameter whose type is implicit, so that no parentheses are required.
 */
@nonTerminal({ implements: Expression, before: [IdentifierExpression] })
export class ShorthandLambdaExpression extends BaseLambdaExpression {
    @parser(TokenType.IDENT)
    setParamName(token: Token) {
        const param = new LambdaParam();
        param.setName(token);
        this.params = [param];
    }

    @parser(TokenType.FAT_ARROW, { definite: true }) setFatArrow() {}

    @parser(FunctionBody)
    setBody(body: Statement | Expression) {
        this.body = body;
        this.createAndRegisterLocation('self', this.params[0].locations.name, body.locations.self);
    }
}
