import { TokenType } from '~/parser/lexer';
import { ImportDeclaration } from './declarations/ImportDeclaration';
import { NodeBase, SyntaxType, Declaration } from '~/syntax/environment';
import { ExportDeclaration, ExportForwardDeclaration } from '~/syntax';
import { parseImportDeclaration, parseExportForwardDeclaration } from './declarations/parsers';
import { ParseFunc, seq, repeat, select, tok } from '~/parser/parser';
import { FileRange } from '~/core';


export class ModuleRoot extends NodeBase<SyntaxType.ModuleRoot> {
    constructor(
        location: FileRange,
        readonly imports: ReadonlyArray<ImportDeclaration>,
        readonly declarations: ReadonlyArray<Declaration | ExportDeclaration | ExportForwardDeclaration>
    ) { super(location, SyntaxType.ModuleRoot) }
}

export function register(parseDeclaration: ParseFunc<Declaration>, parseExportDeclaration: ParseFunc<ExportDeclaration>) {
    const parseModuleRoot: ParseFunc<ModuleRoot> = seq(
        repeat(parseImportDeclaration, '*'),
        repeat(select<Declaration | ExportDeclaration | ExportForwardDeclaration>(
            parseDeclaration,
            parseExportDeclaration,
            parseExportForwardDeclaration
        ), '*'),
        tok(TokenType.EOF),
        ([imports, declarations], location) => new ModuleRoot(location, imports, declarations)
    );

    return { parseModuleRoot };
}
