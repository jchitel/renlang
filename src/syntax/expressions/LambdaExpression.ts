import { NodeBase, SyntaxType, Statement, Expression } from '~/syntax/environment';
import { Param } from '~/syntax';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, repeat, select } from '~/parser/parser';
import { FileRange } from '~/core';


export class LambdaExpression extends NodeBase<SyntaxType.LambdaExpression> {
    constructor(
        location: FileRange,
        readonly params: ReadonlyArray<Param>,
        readonly body: Expression | Statement
    ) { super(location, SyntaxType.LambdaExpression) }

    accept<P, R = P>(visitor: LambdaExpressionVisitor<P, R>, param: P) {
        return visitor.visitLambdaExpression(this, param);
    }
}

export interface LambdaExpressionVisitor<P, R = P> {
    visitLambdaExpression(node: LambdaExpression, param: P): R;
}

export function register(parseParam: ParseFunc<Param>, parseFunctionBody: ParseFunc<Expression | Statement>) {
    /**
     * LambdaExpression ::= '(' (Param | IDENT)(* sep ',') ')' '=>' FunctionBody
     */
    const parseLambdaExpression: ParseFunc<LambdaExpression> = seq(
        tok('('),
        repeat(select<Param | Token>(
            parseParam,
            tok(TokenType.IDENT)
        ), '*', tok(',')),
        tok(')'),
        tok('=>'),
        parseFunctionBody,
        ([_1, params, _2, _3, body], location) => new LambdaExpression(location, params.map(p => p instanceof Token ? lambdaParam(p) : p), body)
    );

    /**
     * ShorthandLambdaExpression ::= IDENT '=>' FunctionBody
     */
    const parseShorthandLambdaExpression: ParseFunc<LambdaExpression> = seq(
        tok(TokenType.IDENT),
        tok('=>'),
        parseFunctionBody,
        ([param, _, body], location) => new LambdaExpression(location, [lambdaParam(param)], body)
    );

    return { parseLambdaExpression, parseShorthandLambdaExpression };
}

const lambdaParam = (p: Token): Param => new Param(p.location, p, null);
