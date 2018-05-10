import { ParseFunc, seq, tok, repeat, select } from '~/parser/parser';
import { NodeBase, SyntaxType, Declaration } from '~/syntax/environment';
import { ImportDeclaration, parseImportDeclaration } from './ImportDeclaration';
import { ExportDeclaration, ExportForwardDeclaration } from '~/syntax';
import { Token, TokenType } from '~/parser/lexer';
import { FileRange } from '~/core';
import { parseExportForwardDeclaration } from './ExportForwardDeclaration';


export class NamespaceDeclaration extends NodeBase<SyntaxType.NamespaceDeclaration> {
    constructor(
        location: FileRange,
        readonly name: Token,
        readonly imports: ReadonlyArray<ImportDeclaration>,
        readonly declarations: ReadonlyArray<Declaration | ExportDeclaration | ExportForwardDeclaration>
    ) { super(location, SyntaxType.NamespaceDeclaration) }

    accept<T, R = T>(visitor: NamespaceDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitNamespaceDeclaration(this, param);
    }
}

export interface NamespaceDeclarationVisitor<T, R = T> {
    visitNamespaceDeclaration(node: NamespaceDeclaration, param: T): R;
}

export class AnonymousNamespaceDeclaration extends NodeBase<SyntaxType.AnonymousNamespaceDeclaration> {
    constructor(
        location: FileRange,
        readonly imports: ReadonlyArray<ImportDeclaration>,
        readonly declarations: ReadonlyArray<Declaration | ExportDeclaration | ExportForwardDeclaration>
    ) { super(location, SyntaxType.AnonymousNamespaceDeclaration) }

    accept<T, R = T>(visitor: AnonymousNamespaceDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitAnonymousNamespaceDeclaration(this, param);
    }
}

export interface AnonymousNamespaceDeclarationVisitor<T, R = T> {
    visitAnonymousNamespaceDeclaration(node: AnonymousNamespaceDeclaration, param: T): R;
}

export function register(
    parseDeclaration: ParseFunc<Declaration>,
    parseExportDeclaration: ParseFunc<ExportDeclaration>
) {
    /**
     * NamespaceDeclaration ::= 'namespace' IDENT '{' ImportDeclaration* (Declaration | ExportDeclaration | ExportForwardDeclaration)* '}'
     */
    const parseNamespaceDeclaration: ParseFunc<NamespaceDeclaration> = seq(
        tok('namespace'),
        tok(TokenType.IDENT),
        tok('{'),
        repeat(parseImportDeclaration, '*'),
        repeat(select<Declaration | ExportDeclaration | ExportForwardDeclaration>(
            parseDeclaration,
            parseExportDeclaration,
            parseExportForwardDeclaration
        ), '*'),
        tok('}'),
        ([_1, name, _2, imports, declarations], location) => new NamespaceDeclaration(location, name, imports, declarations)
    );

    /**
     * AnonymousNamespaceDeclaration ::= 'namespace' '{' ImportDeclaration* (Declaration | ExportDeclaration | ExportForwardDeclaration)* '}'
     */
    const parseAnonymousNamespaceDeclaration: ParseFunc<AnonymousNamespaceDeclaration> = seq(
        tok('namespace'),
        tok('{'),
        repeat(parseImportDeclaration, '*'),
        repeat(select<Declaration | ExportDeclaration | ExportForwardDeclaration>(
            parseDeclaration,
            parseExportDeclaration,
            parseExportForwardDeclaration
        ), '*'),
        tok('}'),
        ([_1, _2, imports, declarations], location) => new AnonymousNamespaceDeclaration(location, imports, declarations)
    );

    return {
        parseNamespaceDeclaration,
        parseAnonymousNamespaceDeclaration
    };
}
