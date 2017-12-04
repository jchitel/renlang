import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token, TokenType } from '~/parser/Tokenizer';
import { TupleLiteral } from '~/syntax/expressions/TupleLiteral';


@nonTerminal({ implements: Expression, before: [TupleLiteral] })
export class ParenthesizedExpression extends Expression {
    @parser(TokenType.LPAREN)
    setOpenParen(token: Token) {
        this.registerLocation('openParen', token.getLocation());
    }

    @parser(Expression)
    setInner(exp: Expression) {
        this.inner = exp;
    }

    @parser(TokenType.RPAREN, { definite: true })
    setCloseParen(token: Token) {
        this.createAndRegisterLocation('self', this.locations.openParen, token.getLocation());
    }

    inner: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitParenthesizedExpression(this);
    }
}
