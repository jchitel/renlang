use crate::{core::DiagResult, syntax::ModuleRoot};
use lexer::Tokens;
use parser::Parser;
use std::path::PathBuf;

pub mod lexer;
mod parser;
pub mod primitives;

pub fn parse_module(path: PathBuf) -> DiagResult<ModuleRoot> {
    let tokens = Tokens::from_file_path(path)?;
    let parser = Parser::new();
    parser.parse::<ModuleRoot>(tokens)
}
