import { TokenType } from '~/parser/lexer';
import { ImportDeclaration } from './declarations/ImportDeclaration';
import { NodeBase, SyntaxType, Declaration } from '~/syntax/environment';
import { ExportDeclaration, ExportForwardDeclaration } from '~/syntax';
import { ParseFunc, seq, repeat, select, tok } from '~/parser/parser';


export interface ModuleRoot extends NodeBase<SyntaxType.ModuleRoot> {
    readonly imports: ReadonlyArray<ImportDeclaration>;
    readonly declarations: ReadonlyArray<Declaration | ExportDeclaration | ExportForwardDeclaration>;
}

export function register(Declaration: ParseFunc<Declaration>, ExportDeclaration: ParseFunc<ExportDeclaration>) {
    const ModuleRoot: ParseFunc<ModuleRoot> = seq(
        repeat(ImportDeclaration, '*'),
        repeat(select<Declaration | ExportDeclaration | ExportForwardDeclaration>(
            Declaration,
            ExportDeclaration,
            ExportForwardDeclaration
        ), '*'),
        tok(TokenType.EOF),
        ([imports, declarations], location) => ({
            syntaxType: SyntaxType.ModuleRoot as SyntaxType.ModuleRoot,
            location,
            imports,
            declarations
        })
    );

    return { ModuleRoot };
}
