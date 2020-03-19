use crate::parser::primitives::eof;
use crate::parser::primitives::parse;
use crate::parser::primitives::repeat_zero;
use crate::{parser::{primitives::transform, parser_new::{ParseResult, ParseOperation}}, core::{FilePosition, FileRange}, seq};
use super::{ExportDeclaration, ImportDeclaration, ExportForwardDeclaration, Declaration, Syntax, SyntaxType, SyntaxNode};
use NonImport::*;

pub struct ModuleRoot {
    location: FileRange,
    imports: Vec<ImportDeclaration>,
    exports: Vec<ExportDeclaration>,
    forwards: Vec<ExportForwardDeclaration>,
    declarations: Vec<Declaration>,
}

impl Syntax for ModuleRoot {
    fn parse_func() -> Box<dyn ParseOperation<Self>> {
        transform(
            seq!(
                repeat_zero(parse::<ImportDeclaration>()),
                repeat_zero(parse::<NonImport>()),
                eof()
            ),
            |(imports, decls, eof)| {
                let start_pos = FilePosition::new(eof.path(), (0, 0));
                let (exports, forwards, declarations) = sort_non_imports(decls);
                ModuleRoot {
                    location: start_pos.merge(&eof.range()),
                    imports,
                    exports,
                    forwards,
                    declarations,
                }
            }
        )
    }
}

impl SyntaxNode for ModuleRoot {
    fn location(&self) -> FileRange { self.location }
    fn syntax_type(&self) -> SyntaxType { SyntaxType::ModuleRoot }
}

pub enum NonImport {
    Decl(Declaration),
    Export(ExportDeclaration),
    Forward(ExportForwardDeclaration),
}

fn sort_non_imports(non_imports: Vec<NonImport>) -> (Vec<ExportDeclaration>, Vec<ExportForwardDeclaration>, Vec<Declaration>) {
    let exports = vec![];
    let forwards = vec![];
    let decls = vec![];
    for d in non_imports.into_iter() {
        match d {
            Decl(d) => { decls.push(d) },
            Export(e) => { exports.push(e) },
            Forward(f) => { forwards.push(f) },
        }
    }
    (exports, forwards, decls)
}

impl Syntax for NonImport {
    fn parse_func() -> Box<dyn ParseOperation<Self>> {
        let parse_decl = parse::<Declaration>();
        let parse_export = parse::<ExportDeclaration>();
        let parse_forward = parse::<ExportForwardDeclaration>();
        box move |state| {
            if let ParseResult::Success { value, size } = parse_decl(state) {
                ParseResult::Success { value: Decl(value), size }
            } else if let ParseResult::Success { value, size } = parse_export(state) {
                ParseResult::Success { value: Export(value), size }
            } else if let ParseResult::Success { value, size } = parse_forward(state) {
                ParseResult::Success { value: Forward(value), size }
            } else {
                ParseResult::Fail { expected: "a declaration".to_string(), actual: None }
            }
        }
    }
}
