import { verifyMultiOperator, getOperatorMetadata } from '~/runtime/operators';
import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, repeat, tok } from '~/parser/parser';


export interface BinaryExpression extends NodeBase {
    syntaxType: SyntaxType.BinaryExpression;
    left: Expression;
    symbol: Token;
    right: Expression;
}

export interface BinaryExpressionSuffix extends NodeBase {
    syntaxType: SyntaxType.BinaryExpression;
    symbol: Token;
    right: Expression;
    setBase(left: Expression): BinaryExpression;
}

export function register(Expression: ParseFunc<Expression>) {
    const BinaryExpressionSuffix: ParseFunc<BinaryExpressionSuffix> = seq(
        repeat(tok(TokenType.OPER), '+'),
        Expression,
        ([symbol, right], location) => ({
            syntaxType: SyntaxType.BinaryExpression as SyntaxType.BinaryExpression,
            location,
            symbol: verifyMultiOperator(symbol), // TODO: make sure this works
            right,
            setBase(left: Expression) {
                return resolvePrecedence({ // TODO: this will get run more than necessary
                    syntaxType: this.syntaxType,
                    symbol: this.symbol,
                    right: this.right,
                    left,
                    location: this.location.merge(left.location)
                })
            }
        })
    );

    return { BinaryExpressionSuffix };
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
        if (!Token.isToken(item)) {
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
    return expStack[0] as BinaryExpression;
}

function shouldPopOperator(nextToken: Token, stackToken: Token) {
    const nextOper = getOperatorMetadata(nextToken.image, 'infix') as { precedence: number };
    const stackOper = getOperatorMetadata(stackToken.image, 'infix') as { precedence: number, associativity: string };
    return stackOper.precedence >= nextOper.precedence && ['left', 'none'].includes(stackOper.associativity);
}

function binaryExpressionToList(exp: BinaryExpression) {
    const items: (Token | Expression)[] = [];
    // the tree is left-associative, so we assemble the list from right to left
    let operToken = createNewOperToken(exp.symbol);
    let left = exp.left, right = exp.right;
    while (true) {
        items.unshift(right);
        items.unshift(operToken);
        if (left.syntaxType === SyntaxType.BinaryExpression) {
            right = left.right;
            operToken = createNewOperToken(left.symbol);
            left = left.left;
        } else {
            items.unshift(left);
            break;
        }
    }
    return items;
}

function createNewOperToken(tok: Token) {
    return tok.with({});
}

function createNewBinExpression(right: Expression, left: Expression, oper: Token) {
    return {
        syntaxType: SyntaxType.BinaryExpression as SyntaxType.BinaryExpression,
        location: left.location.merge(right.location),
        left,
        symbol: oper,
        right
    };
}
