import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';
import { verifyMultiOperator } from '~/runtime/operators';


export interface UnaryExpression extends NodeBase {
    syntaxType: SyntaxType.UnaryExpression;
    target: Expression;
    symbol: Token;
    prefix: boolean;
}

export interface PostfixExpressionSuffix extends NodeBase {
    syntaxType: SyntaxType.UnaryExpression;
    symbol: Token;
    prefix: false;
    setBase(target: Expression): UnaryExpression;
}

export function register(Expression: ParseFunc<Expression>) {
    const PrefixExpression: ParseFunc<UnaryExpression> = seq(
        repeat(tok(TokenType.OPER), '+'),
        Expression,
        ([symbol, target], location) => ({
            syntaxType: SyntaxType.UnaryExpression as SyntaxType.UnaryExpression,
            location,
            target,
            symbol: verifyMultiOperator(symbol), // TODO: make sure this works
            prefix: true
        })
    );

    const PostfixExpressionSuffix: ParseFunc<PostfixExpressionSuffix> = seq(
        repeat(tok(TokenType.OPER), '+'),
        (symbol, location) => ({
            syntaxType: SyntaxType.UnaryExpression as SyntaxType.UnaryExpression,
            location,
            symbol: verifyMultiOperator(symbol), // TODO: make sure this works
            prefix: false as false,
            setBase(target: Expression) {
                return {
                    ...this,
                    target,
                    location: this.location.merge(target.location)
                }
            }
        })
    );

    return { PrefixExpression, PostfixExpressionSuffix };
}
