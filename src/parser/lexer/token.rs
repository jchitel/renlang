use std::fmt::{self, Formatter, Display};
use crate::core::{FilePosition, FileRange};


/// Categorizes tokens by syntactic type
#[derive(PartialEq)]
pub enum TokenType {
    None,              // default
    Comment,           // characters ignored from code
    Ident,             // identifier
    Reserved,          // reserved word
    IntegerLiteral,    // integer number literals
    FloatLiteral,      // floating-point number literals
    StringLiteral,     // character string literals
    CharacterLiteral,  // single character literals
    Oper,              // operators
    Symbol,            // any special syntactic symbols
    Whitespace,        // any non-new-line whitespace (spaces, tabs, etc.)
    NewLine,           // \r\n and \n, has syntactic significance
    Semi,              // semicolon, special delimiter that behaves as a new line
    Eof                // special end-of-file token
}

pub enum TokenValue {
    String(String),
    Char(char),
    Int(isize),
    Float(f32)
}

/// Represents a single token extracted from the source string.
/// 'type' specifies what kind of terminal the token represents, and is used by the parser.
/// 'location' is the text range in the source file where the token is located
/// 'image' is an exact copy of the token from the original source string.
/// 'value' is an optional value that represents the parsed value of the token, if it makes sense for the token type (numbers, strings, etc.).
pub struct Token {
    token_type: TokenType,
    start_position: FilePosition,
    image: String,
    value: Option<TokenValue>,
}

impl Token {
    pub fn new(
        token_type: TokenType,
        start_position: FilePosition,
    ) -> Token {
        Token {
            token_type,
            start_position,
            image: String::new(),
            value: None
        }
    }

    pub fn new_with_value(
        token_type: TokenType,
        start_position: FilePosition,
        value: TokenValue
    ) -> Token {
        Token {
            token_type,
            start_position,
            image: String::new(),
            value: Some(value)
        }
    }

    pub fn token_type(&self) -> &TokenType { &self.token_type }

    pub fn image(&self) -> &str { &self.image }

    pub fn value(&self) -> Option<&TokenValue> { self.value.as_ref() }

    pub fn range(&self) -> FileRange { self.start_position.compute_range(&self.image) }

    pub fn push_char(&self, ch: char) {
        self.image.push(ch);
    }
}

impl Display for Token {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.image)
    }
}
