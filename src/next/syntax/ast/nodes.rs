use super::{
    super::{SyntaxKind, SyntaxNode},
    AstNode,
};

/// The entire source file. Includes all module items.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SourceFile {
    pub(crate) syntax: SyntaxNode,
}

impl AstNode for SourceFile {
    fn can_cast(kind: SyntaxKind) -> bool { kind == SyntaxKind::SourceFile }
    fn cast(syntax: SyntaxNode) -> Option<Self> {
        if Self::can_cast(syntax.kind()) {
            Some(Self { syntax })
        } else {
            None
        }
    }
    fn syntax(&self) -> &SyntaxNode { &self.syntax }
}
