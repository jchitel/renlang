use crate::parser::lexer::TokenType;
use super::declarations::ImportDeclaration;
use super::environment::{ NodeBase, SyntaxType, Declaration };
use super::{ ExportDeclaration, ExportForwardDeclaration };
use super::declarations::parsers::{ parseImportDeclaration, parseExportForwardDeclaration };
use crate::parser::{ ParseFunc, seq, repeat, select, tok };
use crate::core::FileRange;


enum NonImportDeclaration {
    Declaration(Declaration),
    ExportDeclaration(ExportDeclaration),
    ExportForwardDeclaration(ExportForwardDeclaration)
}

pub struct ModuleRoot {
    location: FileRange,
    imports: Vec<ImportDeclaration>,
    declarations: Vec<NonImportDeclaration>
}

impl NodeBase for ModuleRoot {
    fn location(&self) { return self.location; }
    fn syntax_type(&self) { return SyntaxType::ModuleRoot; }
}

pub fn register(
    parse_declaration: ParseFunc<Declaration>,
    parse_export_declaration: ParseFunc<ExportDeclaration>
) -> ParseFunc<ModuleRoot> {
    let parse_module_root: ParseFunc<ModuleRoot> = seq(
        repeat(parseImportDeclaration, '*'),
        repeat(select::<NonImportDeclaration>(
            parseDeclaration,
            parseExportDeclaration,
            parseExportForwardDeclaration
        ), '*'),
        tok(TokenType.EOF),
        |(imports, declarations), location| { ModuleRoot { location, imports, declarations } }
    );

    return parse_module_root;
}
