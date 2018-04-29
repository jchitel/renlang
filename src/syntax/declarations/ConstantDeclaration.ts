import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok, optional } from '~/parser/parser';
import { TokenType, Token } from '~/parser/lexer';


export interface ConstantDeclaration extends NodeBase<SyntaxType.ConstantDeclaration> {
    name: Optional<Token>;
    value: Expression;
}

export function register(Expression: ParseFunc<Expression>) {
    /**
     * ConstantDeclaration ::= 'const' IDENT? EQUALS Expression
     */
    const ConstantDeclaration: ParseFunc<ConstantDeclaration> = seq(
        tok('const'),
        optional(tok(TokenType.IDENT)),
        tok('='),
        Expression,
        ([_1, name, _2, value], location) => ({
            syntaxType: SyntaxType.ConstantDeclaration as SyntaxType.ConstantDeclaration,
            location,
            name,
            value
        })
    );

    return { ConstantDeclaration };
}
