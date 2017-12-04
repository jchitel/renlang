import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';
import { ShorthandLambdaExpression } from '~/syntax/expressions/LambdaExpression';
import { IdentifierExpression } from '~/syntax/expressions/IdentifierExpression';


@nonTerminal({ implements: Expression, before: [ShorthandLambdaExpression, IdentifierExpression] })
export class VarDeclaration extends Expression {
    @parser(TokenType.IDENT)
    setName(token: Token) {
        this.name = token.image;
        this.registerLocation('name', token.getLocation());
    }

    @parser(TokenType.EQUALS, { definite: true }) setEquals() {}

    @parser(Expression, { err: 'INVALID_INITIAL_VALUE' })
    setInitExp(exp: Expression) {
        this.initExp = exp;
        this.createAndRegisterLocation('self', this.locations.name, exp.locations.self);
    }

    name: string;
    initExp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitVarDeclaration(this);
    }
}
