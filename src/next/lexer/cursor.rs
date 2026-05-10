use std::{convert::TryInto, str::Chars};
use super::kind::{LiteralKind, LexerKind, Base};
use text_size::TextSize;

/// Peekable iterator over a char sequence.
///
/// Next characters can be peeked via `nth_char` method,
/// and position can be shifted forward via `bump` method.
pub(crate) struct LexerCursor<'a> {
    initial_len: usize,
    chars: Chars<'a>,
}

impl<'a> LexerCursor<'a> {
    pub(crate) fn new(input: &'a str) -> LexerCursor<'a> {
        LexerCursor {
            initial_len: input.len(),
            chars: input.chars(),
        }
    }

    /// Returns nth character relative to the current cursor position.
    /// If requested position doesn't exist, `EOF_CHAR` is returned.
    /// However, getting `EOF_CHAR` doesn't always mean actual end of file,
    /// it should be checked with `is_eof` method.
    fn nth_char(&self, n: usize) -> char {
        self.chars().nth(n).unwrap_or('\0')
    }

    /// Peeks the next symbol from the input stream without consuming it.
    pub(crate) fn first(&self) -> char {
        self.nth_char(0)
    }

    /// Peeks the second symbol from the input stream without consuming it.
    pub(crate) fn second(&self) -> char {
        self.nth_char(1)
    }

    /// Checks if there is nothing more to consume.
    pub(crate) fn is_eof(&self) -> bool {
        self.chars.as_str().is_empty()
    }

    /// Returns amount of already consumed symbols.
    pub(crate) fn len_consumed(&self) -> usize {
        self.initial_len - self.chars.as_str().len()
    }

    /// Returns a `Chars` iterator over the remaining characters.
    fn chars(&self) -> Chars<'a> {
        self.chars.clone()
    }

    /// Moves to the next character.
    pub(crate) fn bump(&mut self) -> Option<char> {
        self.chars.next()
    }
}

fn is_whitespace(c: char) -> bool {
    // This is the set that Unicode calls "whitespace".
    matches!(c,
        // Usual ASCII suspects
        '\u{0009}' // \t
        | '\u{000A}' // \n
        | '\u{000B}' // vertical tab
        | '\u{000C}' // form feed
        | '\u{000D}' // \r
        | '\u{0020}' // space

        // NEXT LINE from latin1
        | '\u{0085}'

        // Bidi markers
        | '\u{200E}' // LEFT-TO-RIGHT MARK
        | '\u{200F}' // RIGHT-TO-LEFT MARK

        // Dedicated whitespace characters from Unicode
        | '\u{2028}' // LINE SEPARATOR
        | '\u{2029}' // PARAGRAPH SEPARATOR
    )
}

fn is_id_start(c: char) -> bool {
    matches!(c, 'a'..='z' | 'A'..='Z' | '_')
}

fn is_id_continue(c: char) -> bool {
    matches!(c, 'a'..='z' | 'A'..='Z' | '0'..='9' | '_')
}

impl<'a> LexerCursor<'a> { 
    /// Parses a token from the input string.
    pub(crate) fn advance_token(&mut self) -> (LexerKind, TextSize) {
        let first_char = self.bump().unwrap();
        let token_kind = match first_char {
            // Slash, comment or block comment.
            '/' => match self.first() {
                '/' => self.line_comment(),
                '*' => self.block_comment(),
                _ => LexerKind::Slash,
            },

            // Whitespace sequence.
            c if is_whitespace(c) => self.whitespace(),

            // Identifier (this should be checked after other variant that can
            // start as identifier).
            c if is_id_start(c) => self.ident(),

            // Numeric literal.
            c @ '0'..='9' => {
                let literal_kind = self.number(c);
                let suffix_start = self.len_consumed();
                self.eat_literal_suffix();
                LexerKind::Literal { kind: literal_kind, suffix_start }
            }

            // One-symbol tokens.
            ';' => LexerKind::Semi,
            ',' => LexerKind::Comma,
            '.' => LexerKind::Dot,
            '(' => LexerKind::OpenParen,
            ')' => LexerKind::CloseParen,
            '{' => LexerKind::OpenBrace,
            '}' => LexerKind::CloseBrace,
            '[' => LexerKind::OpenBracket,
            ']' => LexerKind::CloseBracket,
            '@' => LexerKind::At,
            '#' => LexerKind::Pound,
            '~' => LexerKind::Tilde,
            '?' => LexerKind::Question,
            ':' => LexerKind::Colon,
            '$' => LexerKind::Dollar,
            '=' => LexerKind::Equals,
            '!' => LexerKind::Exclamation,
            '<' => LexerKind::Less,
            '>' => LexerKind::Greater,
            '-' => LexerKind::Minus,
            '&' => LexerKind::Ampersand,
            '|' => LexerKind::Bar,
            '+' => LexerKind::Plus,
            '*' => LexerKind::Star,
            '^' => LexerKind::Caret,
            '%' => LexerKind::Percent,

            // Character literal.
            '\'' => self.character(),

            // String literal.
            '"' => {
                let terminated = self.double_quoted_string();
                let suffix_start = self.len_consumed();
                if terminated {
                    self.eat_literal_suffix();
                }
                let kind = LiteralKind::Str { terminated };
                LexerKind::Literal { kind, suffix_start }
            }
            _ => LexerKind::Unknown,
        };
        (token_kind, self.len_consumed().try_into().unwrap())
    }

    fn line_comment(&mut self) -> LexerKind {
        self.bump();
        self.eat_while(|c| c != '\n');
        LexerKind::LineComment
    }

    fn block_comment(&mut self) -> LexerKind {
        self.bump();
        let mut depth = 1usize;
        while let Some(c) = self.bump() {
            match c {
                '/' if self.first() == '*' => {
                    self.bump();
                    depth += 1;
                }
                '*' if self.first() == '/' => {
                    self.bump();
                    depth -= 1;
                    if depth == 0 {
                        // This block comment is closed, so for a construction like "/* */ */"
                        // there will be a successfully parsed block comment "/* */"
                        // and " */" will be processed separately.
                        break;
                    }
                }
                _ => (),
            }
        }

        LexerKind::BlockComment { terminated: depth == 0 }
    }

    fn whitespace(&mut self) -> LexerKind {
        self.eat_while(is_whitespace);
        LexerKind::Whitespace
    }

    fn ident(&mut self) -> LexerKind {
        // Start is already eaten, eat the rest of identifier.
        self.eat_while(is_id_continue);
        LexerKind::Ident
    }

    fn number(&mut self, first_digit: char) -> LiteralKind {
        let mut base = Base::Decimal;
        if first_digit == '0' {
            // Attempt to parse encoding base.
            let has_digits = match self.first() {
                'b' => {
                    base = Base::Binary;
                    self.bump();
                    self.eat_decimal_digits()
                }
                'o' => {
                    base = Base::Octal;
                    self.bump();
                    self.eat_decimal_digits()
                }
                'x' => {
                    base = Base::Hexadecimal;
                    self.bump();
                    self.eat_hexadecimal_digits()
                }
                // Not a base prefix.
                '0'..='9' | '_' | '.' | 'e' | 'E' => {
                    self.eat_decimal_digits();
                    true
                }
                // Just a 0.
                _ => return LiteralKind::Int { base, empty_int: false },
            };
            // Base prefix was provided, but there were no digits
            // after it, e.g. "0x".
            if !has_digits {
                return LiteralKind::Int { base, empty_int: true };
            }
        } else {
            // No base prefix, parse number in the usual way.
            self.eat_decimal_digits();
        };

        match self.first() {
            // Don't be greedy if this is actually an
            // integer literal followed by field/method access or a range pattern
            // (`0..2` and `12.foo()`)
            '.' if self.second() != '.' && !is_id_start(self.second()) => {
                // might have stuff after the ., and if it does, it needs to start
                // with a number
                self.bump();
                let mut empty_exponent = false;
                if self.first().is_digit(10) {
                    self.eat_decimal_digits();
                    match self.first() {
                        'e' | 'E' => {
                            self.bump();
                            empty_exponent = !self.eat_float_exponent();
                        }
                        _ => (),
                    }
                }
                LiteralKind::Float { base, empty_exponent }
            }
            'e' | 'E' => {
                self.bump();
                let empty_exponent = !self.eat_float_exponent();
                LiteralKind::Float { base, empty_exponent }
            }
            _ => LiteralKind::Int { base, empty_int: false },
        }
    }

    fn character(&mut self) -> LexerKind {
        let terminated = self.single_quoted_string();
        let suffix_start = self.len_consumed();
        if terminated {
            self.eat_literal_suffix();
        }
        let kind = LiteralKind::Char { terminated };
        return LexerKind::Literal { kind, suffix_start };
    }

    fn single_quoted_string(&mut self) -> bool {
        // Check if it's a one-symbol literal.
        if self.second() == '\'' && self.first() != '\\' {
            self.bump();
            self.bump();
            return true;
        }

        // Literal has more than one symbol.

        // Parse until either quotes are terminated or error is detected.
        loop {
            match self.first() {
                // Quotes are terminated, finish parsing.
                '\'' => {
                    self.bump();
                    return true;
                }
                // Probably beginning of the comment, which we don't want to include
                // to the error report.
                '/' => break,
                // Newline without following '\'' means unclosed quote, stop parsing.
                '\n' if self.second() != '\'' => break,
                // End of file, stop parsing.
                _ if self.is_eof() => break,
                // Escaped slash is considered one character, so bump twice.
                '\\' => {
                    self.bump();
                    self.bump();
                }
                // Skip the character.
                _ => {
                    self.bump();
                }
            }
        }
        // String was not terminated.
        false
    }

    /// Eats double-quoted string and returns true
    /// if string is terminated.
    fn double_quoted_string(&mut self) -> bool {
        while let Some(c) = self.bump() {
            match c {
                '"' => {
                    return true;
                }
                '\\' if self.first() == '\\' || self.first() == '"' => {
                    // Bump again to skip escaped character.
                    self.bump();
                }
                _ => (),
            }
        }
        // End of file reached.
        false
    }

    fn eat_decimal_digits(&mut self) -> bool {
        let mut has_digits = false;
        loop {
            match self.first() {
                '_' => {
                    self.bump();
                }
                '0'..='9' => {
                    has_digits = true;
                    self.bump();
                }
                _ => break,
            }
        }
        has_digits
    }

    fn eat_hexadecimal_digits(&mut self) -> bool {
        let mut has_digits = false;
        loop {
            match self.first() {
                '_' => {
                    self.bump();
                }
                '0'..='9' | 'a'..='f' | 'A'..='F' => {
                    has_digits = true;
                    self.bump();
                }
                _ => break,
            }
        }
        has_digits
    }

    /// Eats the float exponent. Returns true if at least one digit was met,
    /// and returns false otherwise.
    fn eat_float_exponent(&mut self) -> bool {
        if self.first() == '-' || self.first() == '+' {
            self.bump();
        }
        self.eat_decimal_digits()
    }

    // Eats the suffix of the literal, e.g. "_u8".
    fn eat_literal_suffix(&mut self) {
        self.eat_identifier();
    }

    // Eats the identifier.
    fn eat_identifier(&mut self) {
        if !is_id_start(self.first()) {
            return;
        }
        self.bump();

        self.eat_while(is_id_continue);
    }

    /// Eats symbols while predicate returns true or until the end of file is reached.
    /// Returns amount of eaten symbols.
    fn eat_while<F>(&mut self, mut predicate: F) -> usize
    where
        F: FnMut(char) -> bool,
    {
        let mut eaten: usize = 0;
        while predicate(self.first()) && !self.is_eof() {
            eaten += 1;
            self.bump();
        }

        eaten
    }
}
