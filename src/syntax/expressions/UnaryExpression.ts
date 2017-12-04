import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { UnaryOperator, verifyMultiOperator } from '~/runtime/operators';
import { Token, TokenType } from '~/parser/Tokenizer';


export abstract class UnaryExpression extends Expression {
    target: Expression;
    symbol: string;
    prefix: boolean;
    operator: UnaryOperator;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitUnaryExpression(this);
    }

    protected setOperator(tokens: Token[]) {
        const oper = verifyMultiOperator(tokens);
        this.symbol = oper.image;
        this.registerLocation('oper', oper.getLocation());
    }
}

@nonTerminal({ implements: Expression })
export class PrefixExpression extends UnaryExpression {
    // operators have to be parsed as + because < and > screw everything up
    @parser(TokenType.OPER, { repeat: '+', definite: true })
    setOperatorToken(tokens: Token[]) {
        super.setOperator(tokens);
        this.prefix = true;
    }

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setTarget(exp: Expression) {
        this.target = exp;
        this.createAndRegisterLocation('self', this.locations.oper, exp.locations.self);
    }
}

@nonTerminal({ implements: Expression, leftRecursive: 'setTarget' })
export class PostfixExpression extends UnaryExpression {
    setTarget(exp: Expression) {
        this.target = exp;
    }

    // operators have to be parsed as + because < and > screw everything up
    @parser(TokenType.OPER, { repeat: '+', definite: true })
    setOperatorToken(tokens: Token[]) {
        super.setOperator(tokens);
        this.prefix = false;
        this.createAndRegisterLocation('self', this.target.locations.self, this.locations.oper);
    }
}
