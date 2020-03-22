use std::{fs, path::Path, io::ErrorKind};
use crate::{core::DiagResult, syntax::ModuleRoot};
use parser_new::Parser;

pub mod lexer;
mod parser;
pub mod parser_new;
pub mod primitives;
pub mod token;

pub fn parse_module<P: AsRef<Path>>(path: P) -> DiagResult<ModuleRoot> {
    let path = path.as_ref();
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(err) => {
            let msg = match err.kind() {
                ErrorKind::NotFound => format!("File {} not found", path.display()),
                kind => format!("An error occurred reading file {}: {:?}", path.display(), kind),
            };
            return DiagResult::from_error_message(msg, path);
        }
    };
    let parser = Parser::new::<ModuleRoot>();
    parser.parse(path.as_ref(), text)
}
