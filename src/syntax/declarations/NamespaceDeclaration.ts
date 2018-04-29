import { ParseFunc, seq, tok, repeat, select, optional } from '~/parser/parser';
import { NodeBase, SyntaxType, Declaration } from '~/syntax/environment';
import { ImportDeclaration } from './ImportDeclaration';
import { ExportDeclaration, ExportForwardDeclaration } from '~/syntax';
import { Token, TokenType } from '~/parser/lexer';


export interface NamespaceDeclaration extends NodeBase<SyntaxType.NamespaceDeclaration> {
    readonly name: Optional<Token>;
    readonly imports: ReadonlyArray<ImportDeclaration>;
    readonly declarations: ReadonlyArray<Declaration | ExportDeclaration | ExportForwardDeclaration>;
}

export function register(
    Declaration: ParseFunc<Declaration>,
    ExportDeclaration: ParseFunc<ExportDeclaration>
) {
    /**
     * NamespaceDeclaration ::= 'namespace' IDENT? '{' ImportDeclaration* (Declaration | ExportDeclaration | ExportForwardDeclaration)* '}'
     */
    const NamespaceDeclaration: ParseFunc<NamespaceDeclaration> = seq(
        tok('namespace'),
        optional(tok(TokenType.IDENT)),
        tok('{'),
        repeat(ImportDeclaration, '*'),
        repeat(select<Declaration | ExportDeclaration | ExportForwardDeclaration>(
            Declaration,
            ExportDeclaration,
            ExportForwardDeclaration
        ), '*'),
        tok('}'),
        ([_1, name, _2, imports, declarations], location) => ({
            syntaxType: SyntaxType.NamespaceDeclaration as SyntaxType.NamespaceDeclaration,
            location,
            name,
            imports,
            declarations
        })
    );

    return {
        NamespaceDeclaration
    };
}
