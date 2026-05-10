use rowan::{GreenNode, GreenNodeBuilder, Language};
use smol_str::SmolStr;
use text_size::TextSize;

use super::{ParseResult, SyntaxError, SyntaxKind};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum MyLanguage {}
impl Language for MyLanguage {
    type Kind = SyntaxKind;

    fn kind_from_raw(raw: rowan::SyntaxKind) -> SyntaxKind {
        SyntaxKind::from(raw.0)
    }

    fn kind_to_raw(kind: SyntaxKind) -> rowan::SyntaxKind {
        rowan::SyntaxKind(kind.into())
    }
}

pub type SyntaxNode = rowan::SyntaxNode<MyLanguage>;
pub type SyntaxToken = rowan::SyntaxToken<MyLanguage>;
pub type SyntaxElement = rowan::SyntaxElement<MyLanguage>;
pub type SyntaxNodeChildren = rowan::SyntaxNodeChildren<MyLanguage>;
pub type SyntaxElementChildren = rowan::SyntaxElementChildren<MyLanguage>;

#[derive(Default)]
pub struct SyntaxTreeBuilder {
    errors: Vec<SyntaxError>,
    inner: GreenNodeBuilder<'static>,
}

impl SyntaxTreeBuilder {
    pub(crate) fn finish_raw(self) -> (GreenNode, Vec<SyntaxError>) {
        let green = self.inner.finish();
        (green, self.errors)
    }

    pub fn finish(self) -> ParseResult<SyntaxNode> {
        let (green, errors) = self.finish_raw();
        ParseResult::new(green, errors)
    }

    pub fn token(&mut self, kind: SyntaxKind, text: SmolStr) {
        let kind = MyLanguage::kind_to_raw(kind);
        self.inner.token(kind, text)
    }

    pub fn start_node(&mut self, kind: SyntaxKind) {
        let kind = MyLanguage::kind_to_raw(kind);
        self.inner.start_node(kind)
    }

    pub fn finish_node(&mut self) {
        self.inner.finish_node()
    }

    pub fn error(&mut self, message: String, text_pos: TextSize) {
        self.errors.push(SyntaxError::new_at_offset(message, text_pos))
    }
}
