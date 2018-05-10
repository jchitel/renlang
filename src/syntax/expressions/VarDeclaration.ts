import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class VarDeclaration extends NodeBase<SyntaxType.VarDeclaration> {
    constructor(
        location: FileRange,
        readonly name: Token,
        readonly init: Expression
    ) { super(location, SyntaxType.VarDeclaration) }

    accept<P, R = P>(visitor: VarDeclarationVisitor<P, R>, param: P) {
        return visitor.visitVarDeclaration(this, param);
    }
}

export interface VarDeclarationVisitor<P, R = P> {
    visitVarDeclaration(node: VarDeclaration, param: P): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    const parseVarDeclaration: ParseFunc<VarDeclaration> = seq(
        tok(TokenType.IDENT),
        tok('='),
        parseExpression,
        ([name, _, init], location) => new VarDeclaration(location, name, init)
    );

    return { parseVarDeclaration };
}
