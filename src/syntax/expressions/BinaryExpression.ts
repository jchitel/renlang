import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { BinaryOperator, getOperatorMetadata, verifyMultiOperator } from '~/runtime/operators';
import { TokenType, Token, Location } from '~/parser/Tokenizer';
import { PostfixExpression } from '~/syntax/expressions/UnaryExpression';


@nonTerminal({ implements: Expression, before: [PostfixExpression], leftRecursive: 'setLeft' })
export class BinaryExpression extends Expression {
    setLeft(exp: Expression) {
        this.left = exp;
    }

    // operators have to be parsed as oneOrMore because < and > screw everything up
    @parser(TokenType.OPER, { repeat: '+' })
    setOperator(tokens: Token[]) {
        const oper = verifyMultiOperator(tokens);
        this.symbol = oper.image;
        this.registerLocation('oper', oper.getLocation());
    }

    @parser(Expression, { definite: true })
    setRight(exp: Expression) {
        this.right = exp;
        this.createAndRegisterLocation('self', this.left.locations.self, this.right.locations.self);
        // TODO: find a more performant way to do this so that it doesn't happen on every recursion
        resolvePrecedence(this);
    }

    left: Expression;
    right: Expression;
    symbol: string;
    operator: BinaryOperator;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBinaryExpression(this);
    }
}

/**
 * Normal parsing results in a fully left-biased tree of binary expressions,
 * but precedence rules require the tree to be of a different structure.
 * This uses the Shunting-yard algorithm to rearrange the tree correctly.
 * The passed-in expression will be mutated with the correct structure.
 */
function resolvePrecedence(exp: BinaryExpression) {
    // convert binary expression tree to a list of "exp oper exp oper exp ..."
    const items = binaryExpressionToList(exp);
    // algorithm start
    const expStack: Expression[] = [];
    const operStack: Token[] = [];
    while (items.length) {
        const item = items.shift() as (Expression | Token);
        if (item instanceof Expression) {
            expStack.push(item);
        } else {
            while (operStack.length && shouldPopOperator(item, operStack[operStack.length - 1])) {
                expStack.push(createNewBinExpression(expStack.pop()!, expStack.pop()!, operStack.pop()!));
            }
            operStack.push(item);
        }
    }
    // empty the operator stack
    while (operStack.length) {
        expStack.push(createNewBinExpression(expStack.pop()!, expStack.pop()!, operStack.pop()!));
    }
    // final expression tree is the only element left on the exp stack
    const result = expStack[0] as BinaryExpression;
    // apply the resulting properties onto the target expression
    exp.left = result.left;
    exp.right = result.right;
    exp.symbol = result.symbol;
    exp.locations = result.locations;
}

function shouldPopOperator(nextToken: Token, stackToken: Token) {
    const nextOper = getOperatorMetadata(nextToken.image, 'infix') as { precedence: number };
    const stackOper = getOperatorMetadata(stackToken.image, 'infix') as { precedence: number, associativity: string };
    return stackOper.precedence >= nextOper.precedence && ['left', 'none'].includes(stackOper.associativity);
}

function binaryExpressionToList(exp: BinaryExpression) {
    const items: (Token | Expression)[] = [];
    // the tree is left-associative, so we assemble the list from right to left
    let operToken = createNewOperToken(exp.locations.oper, exp.symbol);
    let left = exp.left, right = exp.right;
    while (true) {
        items.unshift(right);
        items.unshift(operToken);
        if (left instanceof BinaryExpression) {
            right = left.right;
            operToken = createNewOperToken(left.locations.oper, left.symbol);
            left = left.left;
        } else {
            items.unshift(left);
            break;
        }
    }
    return items;
}

function createNewOperToken(loc: Location, symbol: string) {
    return new Token(TokenType.OPER, loc.startLine, loc.startColumn, symbol);
}

function createNewBinExpression(right: Expression, left: Expression, oper: Token) {
    const exp = new BinaryExpression();
    exp.right = right;
    exp.left = left;
    exp.symbol = oper.image;
    exp.registerLocation('oper', oper.getLocation());
    exp.createAndRegisterLocation('self', exp.left.locations.self, exp.right.locations.self);
    return exp;
}
