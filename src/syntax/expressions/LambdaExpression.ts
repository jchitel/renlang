import { NodeBase, SyntaxType, Statement, Expression } from '~/syntax/environment';
import { Param } from '~/syntax';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok, repeat, select } from '~/parser/parser';


export interface LambdaExpression extends NodeBase<SyntaxType.LambdaExpression> {
    params: ReadonlyArray<Param>;
    body: Expression | Statement;
}

export function register(Param: ParseFunc<Param>, FunctionBody: ParseFunc<Expression | Statement>) {
    /**
     * LambdaExpression ::= '(' (Param | IDENT)(* sep ',') ')' '=>' FunctionBody
     */
    const LambdaExpression: ParseFunc<LambdaExpression> = seq(
        tok('('),
        repeat(select<Param | Token>(
            Param,
            tok(TokenType.IDENT)
        ), '*', tok(',')),
        tok(')'),
        tok('=>'),
        FunctionBody,
        ([_1, params, _2, _3, body], location) => ({
            syntaxType: SyntaxType.LambdaExpression as SyntaxType.LambdaExpression,
            location,
            params: params.map(p => p instanceof Token ? lambdaParam(p) : p),
            body
        })
    );

    /**
     * ShorthandLambdaExpression ::= IDENT '=>' FunctionBody
     */
    const ShorthandLambdaExpression: ParseFunc<LambdaExpression> = seq(
        tok(TokenType.IDENT),
        tok('=>'),
        FunctionBody,
        ([param, _, body], location) => ({
            syntaxType: SyntaxType.LambdaExpression as SyntaxType.LambdaExpression,
            location,
            params: [lambdaParam(param)],
            body
        })
    );

    return { LambdaExpression, ShorthandLambdaExpression };
}

const lambdaParam = (p: Token): Param => ({
    syntaxType: SyntaxType.Param as SyntaxType.Param,
    location: p.location,
    name: p,
    typeNode: null
});
