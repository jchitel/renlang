import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface VarDeclaration extends NodeBase<SyntaxType.VarDeclaration> {
    name: Token;
    init: Expression;
}

export function register(Expression: ParseFunc<Expression>) {
    const VarDeclaration: ParseFunc<VarDeclaration> = seq(
        tok(TokenType.IDENT),
        tok('='),
        Expression,
        ([name, _, init], location) => ({
            syntaxType: SyntaxType.VarDeclaration as SyntaxType.VarDeclaration,
            location,
            name,
            init
        })
    );

    return { VarDeclaration };
}
