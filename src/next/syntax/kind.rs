#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash, PartialOrd, Ord)]
#[repr(u16)]
pub enum SyntaxKind {
    // Terminal types
    Comment,
    Whitespace,
    Underscore,
    Ident,
    Integer,
    Float,
    Char,
    Str,
    Semi,
    Comma,
    Dot,
    OpenParen,
    CloseParen,
    OpenBrace,
    CloseBrace,
    OpenBracket,
    CloseBracket,
    At,
    Pound,
    Tilde,
    Question,
    Colon,
    Dollar,
    Equals,
    Exclamation,
    Less,
    Greater,
    Minus,
    Ampersand,
    Bar,
    Plus,
    Star,
    Slash,
    Caret,
    Percent,
    // Keywords
    // Non-terminal types
    SourceFile,
    // Special types
    EOF,
    Error,
    __LAST,
}

impl SyntaxKind {
    pub fn from_keyword(ident: &str) -> Option<SyntaxKind> {
        let kw = match ident {
            // keywords here, e.g:
            // "as" => AS_KW,
            _ => return None,
        };
        Some(kw)
    }

    pub fn is_trivia(self) -> bool {
        match self {
            SyntaxKind::Whitespace | SyntaxKind::Comment => true,
            _ => false,
        }
    }

    /// Returns whether this kind can have an outer doc comment
    pub fn can_have_outer_doc_comment(self) -> bool {
        match self {
            _ => false
        }
    }
}

impl From<u16> for SyntaxKind {
    fn from(d: u16) -> SyntaxKind {
        assert!(d <= (SyntaxKind::__LAST as u16));
        unsafe { std::mem::transmute::<u16, SyntaxKind>(d) }
    }
}

impl From<SyntaxKind> for u16 {
    fn from(k: SyntaxKind) -> u16 {
        k as u16
    }
}
