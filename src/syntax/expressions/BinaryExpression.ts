import { verifyMultiOperator, getOperatorMetadata } from '~/runtime/operators';
import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, repeat, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class BinaryExpression extends NodeBase<SyntaxType.BinaryExpression> {
    constructor(
        location: FileRange,
        readonly left: Expression,
        readonly symbol: Token,
        readonly right: Expression
    ) { super(location, SyntaxType.BinaryExpression) }

    accept<P, R = P>(visitor: BinaryExpressionVisitor<P, R>, param: P) {
        return visitor.visitBinaryExpression(this, param);
    }
}

export interface BinaryExpressionVisitor<P, R = P> {
    visitBinaryExpression(node: BinaryExpression, param: P): R;
}

export class BinaryExpressionSuffix extends NodeBase<SyntaxType.BinaryExpression> {
    constructor(
        location: FileRange,
        readonly symbol: Token,
        readonly right: Expression
    ) { super(location, SyntaxType.BinaryExpression) }

    // TODO: this will get run more than necessary
    setBase = (left: Expression) => resolvePrecedence(new BinaryExpression(this.location, left, this.symbol, this.right));
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseBinaryExpressionSuffix: ParseFunc<BinaryExpressionSuffix> = seq(
        repeat(tok(TokenType.OPER), '+'),
        parseExpression,
        // TODO: make sure this works
        ([symbol, right], location) => new BinaryExpressionSuffix(location, verifyMultiOperator(symbol), right)
    );

    return { parseBinaryExpressionSuffix };
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
        if (!(item instanceof Token)) {
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
    let operToken: Token = exp.symbol.clone();
    let left = exp.left, right = exp.right;
    while (true) {
        items.unshift(right);
        items.unshift(operToken);
        if (left.syntaxType === SyntaxType.BinaryExpression) {
            right = left.right;
            operToken = left.symbol.clone();
            left = left.left;
        } else {
            items.unshift(left);
            break;
        }
    }
    return items;
}

function createNewBinExpression(right: Expression, left: Expression, oper: Token) {
    return new BinaryExpression(left.location.merge(right.location), left, oper, right);
}
