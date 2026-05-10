/// Enum representing common lexeme types.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum LexerKind {
    // Multi-char tokens:
    /// "// comment"
    LineComment,
    /// "/* block comment */"
    /// Block comments can be recursive, so the sequence like "/* /* */"
    /// will not be considered terminated and will result in a parsing error.
    BlockComment { terminated: bool },
    /// Any whitespace characters sequence.
    Whitespace,
    /// "ident" or "continue"
    /// At this step keywords are also considered identifiers.
    Ident,
    /// "12_u8", "1.0e-40", "b"123"". See `LiteralKind` for more details.
    Literal { kind: LiteralKind, suffix_start: usize },

    // One-char tokens:
    /// ";"
    Semi,
    /// ","
    Comma,
    /// "."
    Dot,
    /// "("
    OpenParen,
    /// ")"
    CloseParen,
    /// "{"
    OpenBrace,
    /// "}"
    CloseBrace,
    /// "["
    OpenBracket,
    /// "]"
    CloseBracket,
    /// "@"
    At,
    /// "#"
    Pound,
    /// "~"
    Tilde,
    /// "?"
    Question,
    /// ":"
    Colon,
    /// "$"
    Dollar,
    /// "="
    Equals,
    /// "!"
    Exclamation,
    /// "<"
    Less,
    /// ">"
    Greater,
    /// "-"
    Minus,
    /// "&"
    Ampersand,
    /// "|"
    Bar,
    /// "+"
    Plus,
    /// "*"
    Star,
    /// "/"
    Slash,
    /// "^"
    Caret,
    /// "%"
    Percent,

    /// Unknown token, not expected by the lexer, e.g. "№"
    Unknown,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum LiteralKind {
    /// "12_u8", "0o100", "0b120i99"
    Int { base: Base, empty_int: bool },
    /// "12.34f32", "0b100.100"
    Float { base: Base, empty_exponent: bool },
    /// "'a'", "'\\'", "'''", "';"
    Char { terminated: bool },
    /// ""abc"", ""abc"
    Str { terminated: bool },
}

/// Base of numeric literal encoding according to its prefix.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Base {
    /// Literal starts with "0b".
    Binary,
    /// Literal starts with "0o".
    Octal,
    /// Literal starts with "0x".
    Hexadecimal,
    /// Literal doesn't contain a prefix.
    Decimal,
}
