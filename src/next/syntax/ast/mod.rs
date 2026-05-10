mod nodes;

use super::{
    SyntaxNode,
    kind::SyntaxKind
};

pub use nodes::*;

pub trait AstNode {
    fn can_cast(kind: SyntaxKind) -> bool;

    fn cast(syntax: SyntaxNode) -> Option<Self>
        where Self: Sized;

    fn syntax(&self) -> &SyntaxNode;
}
