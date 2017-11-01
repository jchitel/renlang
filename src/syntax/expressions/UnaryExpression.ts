import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import { verifyMultiOperator, UnaryOperator } from '../../runtime/operators';
import INodeVisitor from '../INodeVisitor';


export class UnaryExpression extends Expression {
    target: Expression;
    symbol: string;
    prefix: boolean;
    operator: UnaryOperator;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitUnaryExpression(this);
    }
}

export class STUnaryExpression extends STExpression {
    operatorToken: Token;
    target: STExpression;

    reduce() {
        // verify that any multiple operator tokens are valid
        this.operatorToken = verifyMultiOperator(this.operatorToken);
        const node = new UnaryExpression();
        node.symbol = this.operatorToken.image;
        node.registerLocation('oper', this.operatorToken.getLocation());
        node.target = this.target.reduce();
        return node;
    }
}

export class STPrefixExpression extends STUnaryExpression {
    reduce() {
        const node = super.reduce();
        node.createAndRegisterLocation('self', node.locations.oper, node.target.locations.self);
        return node;
    }
}

export class STPostfixExpression extends STUnaryExpression {
    reduce() {
        const node = super.reduce();
        node.createAndRegisterLocation('self', node.target.locations.self, node.locations.oper);
        return node;
    }
}
