use crate::parser::parser_new::ParseFunc;
use super::{parser_new::{ParseState, ParseResult}, lexer::Token};
use std::any::Any;

pub fn transform<T1: Any, F1: ParseFunc<T1>, T2: Any, F2: Fn(T1) -> T2>(parse: F1, transform: F2) -> impl ParseFunc<T2> {
    
}

/// Parses a terminal symbol, yielding a string.
pub fn term(terminal: &'static str) -> impl ParseFunc<String> {
    // The basic idea is that we check 
    |state: ParseState| {
        let s = String::new();
        for ch in terminal.chars() {
            if let Some(actual) = state.next() {
                if actual == ch { s.push(actual); }
                else {
                    return ParseResult::Fail { expected: Some(terminal.to_string()), actual: None };
                }
            } else {
                return ParseResult::Fail { expected: Some(terminal.to_string()), actual: None };
            }
        }
        ParseResult::Success { value: s, size: s.len() }
    }
}

/// Parses a single character within the specified character range, yielding that character.
pub fn chars(start: char, end: char) -> impl ParseFunc<char> { todo!() }

/// Parses a `Token`, converting the resulting `String` to a `Token`.
pub fn tok(parse: impl ParseFunc<String>) -> impl ParseFunc<Token> { todo!() }

/// Parses the end of the file.
pub fn eof() -> impl ParseFunc<()> { todo!() }

/// Parses the end of a line (OS-sensitive).
pub fn eol() -> impl ParseFunc<String> { todo!() }

/// Parses a sequence of expressions.
/// 
/// This macro calls a different underlying function depending on the number of expressions
/// in the sequence.
/// 
/// The yielded value is a tuple containing the fully-parsed sequence.
#[macro_export]
macro_rules! seq {
    ($e1:expr, $e2:expr) => ($crate::parser::primitives::seq2($e1, $e2));
    ($e1:expr, $e2:expr, $e3:expr) => ($crate::parser::primitives::seq3($e1, $e2, $e3));
    ($e1:expr, $e2:expr, $e3:expr, $e4:expr) => ($crate::parser::primitives::seq4($e1, $e2, $e3, $e4));
    ($e1:expr, $e2:expr, $e3:expr, $e4:expr, $e5:expr) => ($crate::parser::primitives::seq5($e1, $e2, $e3, $e4, $e5));
    ($e1:expr, $e2:expr, $e3:expr, $e4:expr, $e5:expr, $e6:expr) => ($crate::parser::primitives::seq6($e1, $e2, $e3, $e4, $e5, $e6));
    ($e1:expr, $e2:expr, $e3:expr, $e4:expr, $e5:expr, $e6:expr, $e7:expr) => ($crate::parser::primitives::seq7($e1, $e2, $e3, $e4, $e5, $e6, $e7));
}

pub fn seq2<T1: 'static, T2: 'static>(
    parse1: impl ParseFunc<T1>,
    parse2: impl ParseFunc<T2>,
) -> impl ParseFunc<(T1, T2)> { todo!() }

pub fn seq3<T1: 'static, T2: 'static, T3: 'static>(
    parse1: impl ParseFunc<T1>,
    parse2: impl ParseFunc<T2>,
    parse3: impl ParseFunc<T3>,
) -> impl ParseFunc<(T1, T2, T3)> { todo!() }

pub fn seq4<T1: 'static, T2: 'static, T3: 'static, T4: 'static>(
    parse1: impl ParseFunc<T1>,
    parse2: impl ParseFunc<T2>,
    parse3: impl ParseFunc<T3>,
    parse4: impl ParseFunc<T4>,
) -> impl ParseFunc<(T1, T2, T3, T4)> { todo!() }

pub fn seq5<T1: 'static, T2: 'static, T3: 'static, T4: 'static, T5: 'static>(
    parse1: impl ParseFunc<T1>,
    parse2: impl ParseFunc<T2>,
    parse3: impl ParseFunc<T3>,
    parse4: impl ParseFunc<T4>,
    parse5: impl ParseFunc<T5>,
) -> impl ParseFunc<(T1, T2, T3, T4, T5)> { todo!() }

pub fn seq6<T1: 'static, T2: 'static, T3: 'static, T4: 'static, T5: 'static, T6: 'static>(
    parse1: impl ParseFunc<T1>,
    parse2: impl ParseFunc<T2>,
    parse3: impl ParseFunc<T3>,
    parse4: impl ParseFunc<T4>,
    parse5: impl ParseFunc<T5>,
    parse6: impl ParseFunc<T6>,
) -> impl ParseFunc<(T1, T2, T3, T4, T5, T6)> { todo!() }

pub fn seq7<T1: 'static, T2: 'static, T3: 'static, T4: 'static, T5: 'static, T6: 'static, T7: 'static>(
    parse1: impl ParseFunc<T1>,
    parse2: impl ParseFunc<T2>,
    parse3: impl ParseFunc<T3>,
    parse4: impl ParseFunc<T4>,
    parse5: impl ParseFunc<T5>,
    parse6: impl ParseFunc<T6>,
    parse7: impl ParseFunc<T7>,
) -> impl ParseFunc<(T1, T2, T3, T4, T5, T6, T7)> { todo!() }

/// Parses the first successful expression in a list of expressions.
/// 
/// All parse functions must return the same type.
#[macro_export]
macro_rules! choice {
    ($($choices:expr),*) => {
        $crate::parser::primitives::choice(vec![$($choices),*])
    };
}

pub fn choice<T: 'static>(choices: Vec<impl ParseFunc<T>>) -> impl ParseFunc<T> { todo!() }

/// Simple enum to specify whether a repetition expression repeats
/// zero-or-more times, or one-or-more times.
pub enum RepeatBase {
    Zero,
    One
}

/// Parses multiple instances of an expression, either zero-or-more (*)
/// or one-or-more (+) times.
/// 
/// The yielded value is a vector of all parsed instances.
pub fn repeat<T: 'static>(parse: impl ParseFunc<T>, base: RepeatBase) -> impl ParseFunc<Vec<T>> { todo!() }

/// Parses an expression where it can either be present or not present.
/// 
/// The yielded value is an `Option` containin either the parsed value
/// or `None` if the value could not be parsed.
pub fn opt<T: 'static>(parse: impl ParseFunc<T>) -> impl ParseFunc<Option<T>> { todo!() }

/// Parses an expression without consuming characters.
/// 
/// If the expression is successfully parsed, nothing happens and an empty tuple is yielded.
/// 
/// If the expression fails to parse, this expression will also fail.
/// 
/// This is useful for ensuring that an expression is followed by another expression.
pub fn and<T: 'static>(parse: impl ParseFunc<T>) -> impl ParseFunc<()> { todo!() }

/// Ensures that an expression cannot be parsed at the current position,
/// without consuming characters.
/// 
/// If the expression is successfully parsed, this expression will fail.
/// 
/// If the expression fails to parse, nothing happens and an empty tuple is yielded.
/// 
/// This is useful for ensuring that an expression is NOT followed by another expression.
pub fn not<T: 'static>(parse: impl ParseFunc<T>) -> impl ParseFunc<()> { todo!() }
