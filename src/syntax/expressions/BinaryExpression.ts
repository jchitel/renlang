import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import { getOperatorMetadata, verifyMultiOperator, BinaryOperator } from '../../runtime/operators';
import INodeVisitor from '../INodeVisitor';


export class BinaryExpression extends Expression {
    left: Expression;
    right: Expression;
    symbol: string;
    operator: BinaryOperator;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBinaryExpression(this);
    }
}

export class STBinaryExpression extends STExpression {
    operatorToken: Token;
    left: STExpression;
    right: STExpression;

    reduce() {
        // handle < and > problems
        this.operatorToken = verifyMultiOperator(this.operatorToken);
        // convert the current binary expression tree to a list
        const items = this.toList();
        // Shunting-yard algorithm to resolve precedence
        const expStack: Expression[] = [];
        const operStack: Token[] = [];
        while (items.length) {
            const item = items.shift() as (Expression | Token);
            if (item instanceof Expression) {
                expStack.push(item);
            } else {
                while (operStack.length && this.shouldPopOperator(item, operStack[operStack.length - 1])) {
                    const exp = new BinaryExpression();
                    exp.right = expStack.pop() as Expression;
                    exp.left = expStack.pop() as Expression;
                    const oper = operStack.pop() as Token;
                    exp.symbol = oper.image;
                    exp.registerLocation('oper', oper.getLocation());
                    exp.createAndRegisterLocation('self', exp.left.locations.self, exp.right.locations.self);
                    expStack.push(exp);
                }
                operStack.push(item);
            }
        }
        // empty the operator stack
        while (operStack.length) {
            const exp = new BinaryExpression();
            exp.right = expStack.pop() as Expression;
            exp.left = expStack.pop() as Expression;
            const oper = operStack.pop() as Token;
            exp.symbol = oper.image;
            exp.registerLocation('oper', oper.getLocation());
            exp.createAndRegisterLocation('self', exp.left.locations.self, exp.right.locations.self);
            expStack.push(exp);
        }
        // final expression tree is the only element left on the exp stack
        return expStack[0];
    }

    toList() {
        const items = [];
        // the tree is left-associative, so we assemble the list from right to left
        let right = this.right.reduce();
        let operToken = this.operatorToken;
        // if the left is binary, don't reduce it because that's what we're doing
        let left = this.left.choice instanceof STBinaryExpression ? this.left.choice : this.left.reduce();
        while (true) {
            items.unshift(right);
            items.unshift(operToken);
            if (left instanceof STBinaryExpression) {
                right = left.right.reduce();
                operToken = left.operatorToken;
                left = left.left.choice instanceof STBinaryExpression ? left.left.choice : left.left.reduce();
            } else {
                items.unshift(left);
                break;
            }
        }
        return items;
    }

    shouldPopOperator(nextToken: Token, stackToken: Token) {
        const nextOper = getOperatorMetadata(nextToken.image, 'infix') as { precedence: number };
        const stackOper = getOperatorMetadata(stackToken.image, 'infix') as { precedence: number, associativity: string };
        return stackOper.precedence >= nextOper.precedence && ['left', 'none'].includes(stackOper.associativity);
    }
}
