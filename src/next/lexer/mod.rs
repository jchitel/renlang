mod cursor;
mod kind;

use text_size::{TextRange, TextSize};
use super::syntax::{SyntaxKind, SyntaxError};
use std::convert::TryInto;
use cursor::LexerCursor;
use kind::{LexerKind, LiteralKind};

/// A token of source code.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct LexerToken {
    /// The kind of token.
    pub kind: SyntaxKind,
    /// The length of the token.
    pub len: TextSize,
}

pub fn tokenize(text: &str) -> (Vec<LexerToken>, Vec<SyntaxError>) {
    if text.is_empty() {
        return Default::default();
    }

    let mut tokens = Vec::new();
    let mut errors = Vec::new();
    let mut offset: usize = 0;

    for (kind, len) in token_iter(text) {
        let token_range = TextRange::at(offset.try_into().unwrap(), len);

        let (syntax_kind, err_message) =
            token_kind_to_syntax_kind(&kind, &text[token_range]);

        tokens.push(LexerToken { kind: syntax_kind, len });

        if let Some(err_message) = err_message {
            errors.push(SyntaxError::new(err_message, token_range));
        }

        let len: usize = len.into();
        offset += len;
    }

    (tokens, errors)
}

fn token_iter(mut input: &str) -> impl Iterator<Item = (LexerKind, TextSize)> + '_ {
    std::iter::from_fn(move || {
        if input.is_empty() {
            return None;
        }
        let token = first_token(input);
        input = &input[token.1.into()..];
        Some(token)
    })
}

fn first_token(input: &str) -> (LexerKind, TextSize) {
    LexerCursor::new(input).advance_token()
}

/// Returns `SyntaxKind` and an optional tokenize error message.
fn token_kind_to_syntax_kind(
    token_kind: &LexerKind,
    token_text: &str,
) -> (SyntaxKind, Option<&'static str>) {
    let syntax_kind = {
        match token_kind {
            LexerKind::LineComment => SyntaxKind::Comment,

            LexerKind::BlockComment { terminated: true } => SyntaxKind::Comment,
            LexerKind::BlockComment { terminated: false } => {
                return (
                    SyntaxKind::Comment,
                    Some("Missing trailing `*/` symbols to terminate the block comment"),
                );
            }

            LexerKind::Whitespace => SyntaxKind::Whitespace,

            LexerKind::Ident => {
                if token_text == "_" {
                    SyntaxKind::Underscore
                } else {
                    SyntaxKind::from_keyword(token_text).unwrap_or(SyntaxKind::Ident)
                }
            }

            LexerKind::Literal { kind, .. } => match *kind {
                LiteralKind::Int { empty_int: false, .. } => SyntaxKind::Integer,
                LiteralKind::Int { empty_int: true, .. } => {
                    return (SyntaxKind::Integer, Some("Missing digits after the integer base prefix"))
                }
    
                LiteralKind::Float { empty_exponent: false, .. } => SyntaxKind::Float,
                LiteralKind::Float { empty_exponent: true, .. } => {
                    return (SyntaxKind::Float, Some("Missing digits after the exponent symbol"))
                }
    
                LiteralKind::Char { terminated: true } => SyntaxKind::Char,
                LiteralKind::Char { terminated: false } => {
                    return (SyntaxKind::Char, Some("Missing trailing `'` symbol to terminate the character literal"))
                }
    
                LiteralKind::Str { terminated: true } => SyntaxKind::Str,
                LiteralKind::Str { terminated: false } => {
                    return (SyntaxKind::Str, Some("Missing trailing `\"` symbol to terminate the string literal"))
                }
            },

            LexerKind::Semi => SyntaxKind::Semi,
            LexerKind::Comma => SyntaxKind::Comma,
            LexerKind::Dot => SyntaxKind::Dot,
            LexerKind::OpenParen => SyntaxKind::OpenParen,
            LexerKind::CloseParen => SyntaxKind::CloseParen,
            LexerKind::OpenBrace => SyntaxKind::OpenBrace,
            LexerKind::CloseBrace => SyntaxKind::CloseBrace,
            LexerKind::OpenBracket => SyntaxKind::OpenBracket,
            LexerKind::CloseBracket => SyntaxKind::CloseBracket,
            LexerKind::At => SyntaxKind::At,
            LexerKind::Pound => SyntaxKind::Pound,
            LexerKind::Tilde => SyntaxKind::Tilde,
            LexerKind::Question => SyntaxKind::Question,
            LexerKind::Colon => SyntaxKind::Colon,
            LexerKind::Dollar => SyntaxKind::Dollar,
            LexerKind::Equals => SyntaxKind::Equals,
            LexerKind::Exclamation => SyntaxKind::Exclamation,
            LexerKind::Less => SyntaxKind::Less,
            LexerKind::Greater => SyntaxKind::Greater,
            LexerKind::Minus => SyntaxKind::Minus,
            LexerKind::Ampersand => SyntaxKind::Ampersand,
            LexerKind::Bar => SyntaxKind::Bar,
            LexerKind::Plus => SyntaxKind::Plus,
            LexerKind::Star => SyntaxKind::Star,
            LexerKind::Slash => SyntaxKind::Slash,
            LexerKind::Caret => SyntaxKind::Caret,
            LexerKind::Percent => SyntaxKind::Percent,
            LexerKind::Unknown => SyntaxKind::Error,
        }
    };

    (syntax_kind, None)
}
