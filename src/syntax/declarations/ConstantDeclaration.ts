import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';
import { TokenType, Token } from '~/parser/lexer';
import { FileRange } from '~/core';


export class ConstantDeclaration extends NodeBase<SyntaxType.ConstantDeclaration> {
    constructor(
        location: FileRange,
        readonly name: Token,
        readonly value: Expression
    ) { super(location, SyntaxType.ConstantDeclaration) }

    accept<T, R = T>(visitor: ConstantDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitConstantDeclaration(this, param);
    }
}

export interface ConstantDeclarationVisitor<T, R = T> {
    visitConstantDeclaration(node: ConstantDeclaration, param: T): R;
}

export class AnonymousConstantDeclaration extends NodeBase<SyntaxType.AnonymousConstantDeclaration> {
    constructor(
        location: FileRange,
        readonly value: Expression
    ) { super(location, SyntaxType.AnonymousConstantDeclaration) }

    accept<T, R = T>(visitor: AnonymousConstantDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitAnonymousConstantDeclaration(this, param);
    }
}

export interface AnonymousConstantDeclarationVisitor<T, R = T> {
    visitAnonymousConstantDeclaration(node: AnonymousConstantDeclaration, param: T): R;
}

export function register(parseExpression: ParseFunc<Expression>) {
    /**
     * ConstantDeclaration ::= 'const' IDENT EQUALS Expression
     */
    const parseConstantDeclaration: ParseFunc<ConstantDeclaration> = seq(
        tok('const'),
        tok(TokenType.IDENT),
        tok('='),
        parseExpression,
        ([_1, name, _2, value], location) => new ConstantDeclaration(location, name, value)
    );

    /**
     * AnonymousConstantDeclaration ::= 'const' EQUALS Expression
     */
    const parseAnonymousConstantDeclaration: ParseFunc<AnonymousConstantDeclaration> = seq(
        tok('const'),
        tok('='),
        parseExpression,
        ([_1, _2, value], location) => new AnonymousConstantDeclaration(location, value)
    );

    return { parseConstantDeclaration, parseAnonymousConstantDeclaration };
}
