import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';
import { verifyMultiOperator } from '~/runtime/operators';
import { FileRange } from '~/core';


export class UnaryExpression extends NodeBase<SyntaxType.UnaryExpression> {
    constructor(
        location: FileRange,
        readonly target: Expression,
        readonly symbol: Token,
        readonly prefix: boolean
    ) { super(location, SyntaxType.UnaryExpression) }

    accept<P, R = P>(visitor: UnaryExpressionVisitor<P, R>, param: P) {
        return visitor.visitUnaryExpression(this, param);
    }
}

export interface UnaryExpressionVisitor<P, R = P> {
    visitUnaryExpression(node: UnaryExpression, param: P): R;
}

export class PostfixExpressionSuffix extends NodeBase<SyntaxType.UnaryExpression> {
    constructor(
        location: FileRange,
        readonly symbol: Token
    ) { super(location, SyntaxType.UnaryExpression) }

    setBase = (target: Expression) => new UnaryExpression(this.location.merge(target.location), target, this.symbol, false)
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parsePrefixExpression: ParseFunc<UnaryExpression> = seq(
        repeat(tok(TokenType.OPER), '+'),
        parseExpression,
        // TODO: make sure this works
        ([symbol, target], location) => new UnaryExpression(location, target, verifyMultiOperator(symbol), true)
    );

    const parsePostfixExpressionSuffix: ParseFunc<PostfixExpressionSuffix> = seq(
        repeat(tok(TokenType.OPER), '+'),
        // TODO: make sure this works
        (symbol, location) => new PostfixExpressionSuffix(location, verifyMultiOperator(symbol))
    );

    return { parsePrefixExpression, parsePostfixExpressionSuffix };
}
