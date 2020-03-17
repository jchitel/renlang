use crate::parser::primitives::{Parser, ParseFunc};
use std::any::Any;

//mod declarations;
//pub mod environment;
//mod expressions;
//mod module_root;
//mod parsing;
//mod statements;
//mod types;
//mod visitor;

//pub use environment::Node;
//pub use types::*;
//pub use expressions::*;
//pub use statements::*;
//pub use declarations::*;
//pub use module_root::ModuleRoot;

//pub use environment::{ Declaration, AnonymousDeclaration, Type, Expression, Statement };

//pub use visitor::*;

pub trait Syntax: Any {
    fn non_terminal(parser: Parser) -> ParseFunc<Self>;
}

pub struct ModuleRoot;
pub mod environment {
    pub struct SyntaxEnvironment;
}
pub struct ImportDeclaration;
pub struct ExportDeclaration;
pub struct ExportForwardDeclaration;
pub struct Declaration;
pub struct AnonymousDeclaration;
pub struct NamespaceDeclaration;
pub struct FunctionDeclaration;
pub struct TypeDeclaration;
pub struct ConstantDeclaration;
