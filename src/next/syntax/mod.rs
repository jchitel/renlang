mod ast;
mod error;
mod kind;
mod node;
mod validation;

use std::{marker::PhantomData, sync::Arc};
use rowan::GreenNode;
use crate::format_to;
use super::parser::parse_text;
use ast::AstNode;
use node::SyntaxNode;
use validation::validate;

pub use ast::SourceFile;
pub use kind::SyntaxKind;
pub use error::SyntaxError;
pub use node::SyntaxTreeBuilder;

/// `Parse` is the result of the parsing: a syntax tree and a collection of
/// errors.
///
/// Note that we always produce a syntax tree, even for completely invalid
/// files.
#[derive(Debug, PartialEq, Eq)]
pub struct ParseResult<T> {
    green: GreenNode,
    errors: Arc<Vec<SyntaxError>>,
    _ty: PhantomData<fn() -> T>,
}

impl<T> Clone for ParseResult<T> {
    fn clone(&self) -> ParseResult<T> {
        ParseResult { green: self.green.clone(), errors: self.errors.clone(), _ty: PhantomData }
    }
}

impl<T> ParseResult<T> {
    fn new(green: GreenNode, errors: Vec<SyntaxError>) -> ParseResult<T> {
        ParseResult { green, errors: Arc::new(errors), _ty: PhantomData }
    }

    pub fn syntax_node(&self) -> SyntaxNode {
        SyntaxNode::new_root(self.green.clone())
    }
}

impl<T: AstNode> ParseResult<T> {
    pub fn to_syntax(self) -> ParseResult<SyntaxNode> {
        ParseResult { green: self.green, errors: self.errors, _ty: PhantomData }
    }

    pub fn tree(&self) -> T {
        T::cast(self.syntax_node()).unwrap()
    }

    pub fn errors(&self) -> &[SyntaxError] {
        &*self.errors
    }

    pub fn ok(self) -> Result<T, Arc<Vec<SyntaxError>>> {
        if self.errors.is_empty() {
            Ok(self.tree())
        } else {
            Err(self.errors)
        }
    }
}

impl ParseResult<SyntaxNode> {
    pub fn cast<N: AstNode>(self) -> Option<ParseResult<N>> {
        if N::cast(self.syntax_node()).is_some() {
            Some(ParseResult { green: self.green, errors: self.errors, _ty: PhantomData })
        } else {
            None
        }
    }
}

impl ParseResult<SourceFile> {
    pub fn debug_dump(&self) -> String {
        let mut buf = format!("{:#?}", self.tree().syntax());
        for err in self.errors.iter() {
            format_to!(buf, "error {:?}: {}\n", err.range(), err);
        }
        buf
    }

    // TODO: eventually implement incremental parsing
    /*pub fn reparse(&self, indel: &Indel) -> Parse<SourceFile> {
        self.incremental_reparse(indel).unwrap_or_else(|| self.full_reparse(indel))
    }

    fn incremental_reparse(&self, indel: &Indel) -> Option<Parse<SourceFile>> {
        // FIXME: validation errors are not handled here
        parsing::incremental_reparse(self.tree().syntax(), indel, self.errors.to_vec()).map(
            |(green_node, errors, _reparsed_range)| Parse {
                green: green_node,
                errors: Arc::new(errors),
                _ty: PhantomData,
            },
        )
    }

    fn full_reparse(&self, indel: &Indel) -> Parse<SourceFile> {
        let mut text = self.tree().syntax().text().to_string();
        indel.apply(&mut text);
        SourceFile::parse(&text)
    }*/
}

impl SourceFile {
    pub fn parse(text: &str) -> ParseResult<SourceFile> {
        let (green, mut errors) = parse_text(text);
        let root = SyntaxNode::new_root(green.clone());

        errors.extend(validate(&root));

        assert_eq!(root.kind(), SyntaxKind::SourceFile);
        ParseResult { green, errors: Arc::new(errors), _ty: PhantomData }
    }
}
