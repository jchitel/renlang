import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token, TokenType } from '~/parser/Tokenizer';


@nonTerminal({ implements: Expression })
export class IfElseExpression extends Expression {
    @parser('if', { definite: true })
    setIfToken(token: Token) {
        this.registerLocation('if', token.getLocation());
    }

    @parser(TokenType.LPAREN, { err: 'IF_MISSING_OPEN_PAREN' }) setOpenParen() {}

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setCondition(exp: Expression) {
        this.condition = exp;
    }

    @parser(TokenType.RPAREN, { err: 'IF_MISSING_CLOSE_PAREN' }) setCloseParen() {}

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setConsequent(exp: Expression) {
        this.consequent = exp;
    }

    @parser('else', { err: 'IF_MISSING_ELSE' }) setElse() {}

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setAlternate(exp: Expression) {
        this.alternate = exp;
        this.createAndRegisterLocation('self', this.locations.if, exp.locations.self);
    }

    condition: Expression;
    consequent: Expression;
    alternate: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitIfElseExpression(this);
    }
}
