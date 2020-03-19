use crate::{syntax::Syntax, parser::parser_new::ParseOperation};
use super::{parser_new::{ParseState, ParseResult}, lexer::Token};
use std::any::{TypeId, Any};

/// Wraps a `Syntax` type's parse operation with the necessary book-keeping.
pub fn parse<T: Syntax>() -> Box<dyn ParseOperation<T>> {
    let op = T::parse_func();
    box |state| {
        state.bk_memo(TypeId::of::<T>(), op)
    }
}

/// Performs the parse and then transforms the result with the provided function (assuming it was successful).
pub fn transform<T1: Any, T2: Any>(
    parse: impl ParseOperation<T1> + 'static,
    transform: impl Fn(T1) -> T2 + 'static
) -> Box<dyn ParseOperation<T2>> {
    box move |state| {
        match parse(state) {
            ParseResult::Success { value, size } => ParseResult::Success { value: transform(value), size },
            ParseResult::Fail { expected, actual } => ParseResult::Fail { expected, actual }
        }
    }
}

/// Parses a terminal symbol, yielding a string.
pub fn term(terminal: &'static str) -> Box<dyn ParseOperation<String>> {
    // The basic idea is that we check 
    box |state: &mut ParseState| {
        let s = String::new();
        for ch in terminal.chars() {
            if let Some(actual) = state.next() {
                if actual == ch { s.push(actual); }
                else {
                    return ParseResult::Fail { expected: terminal.to_string(), actual: None };
                }
            } else {
                return ParseResult::Fail { expected: terminal.to_string(), actual: None };
            }
        }
        ParseResult::Success { value: s, size: s.len() }
    }
}

/// Parses a single character within the specified character range, yielding that character.
pub fn chars(start: char, end: char) -> Box<dyn ParseOperation<char>> { todo!() }

/// Parses a `Token`, converting the resulting `String` to a `Token`.
pub fn tok(parse: impl ParseOperation<String>) -> Box<dyn ParseOperation<Token>> { todo!() }

/// Parses the end of the file.
pub fn eof() -> Box<dyn ParseOperation<Token>> { todo!() }

/// Parses the end of a line (OS-sensitive).
pub fn eol() -> Box<dyn ParseOperation<String>> { todo!() }

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
    parse1: impl ParseOperation<T1>,
    parse2: impl ParseOperation<T2>,
) -> Box<dyn ParseOperation<(T1, T2)>> { todo!() }

pub fn seq3<T1: 'static, T2: 'static, T3: 'static>(
    parse1: impl ParseOperation<T1>,
    parse2: impl ParseOperation<T2>,
    parse3: impl ParseOperation<T3>,
) -> Box<dyn ParseOperation<(T1, T2, T3)>> { todo!() }

pub fn seq4<T1: 'static, T2: 'static, T3: 'static, T4: 'static>(
    parse1: impl ParseOperation<T1>,
    parse2: impl ParseOperation<T2>,
    parse3: impl ParseOperation<T3>,
    parse4: impl ParseOperation<T4>,
) -> Box<dyn ParseOperation<(T1, T2, T3, T4)>> { todo!() }

pub fn seq5<T1: 'static, T2: 'static, T3: 'static, T4: 'static, T5: 'static>(
    parse1: impl ParseOperation<T1>,
    parse2: impl ParseOperation<T2>,
    parse3: impl ParseOperation<T3>,
    parse4: impl ParseOperation<T4>,
    parse5: impl ParseOperation<T5>,
) -> Box<dyn ParseOperation<(T1, T2, T3, T4, T5)>> { todo!() }

pub fn seq6<T1: 'static, T2: 'static, T3: 'static, T4: 'static, T5: 'static, T6: 'static>(
    parse1: impl ParseOperation<T1>,
    parse2: impl ParseOperation<T2>,
    parse3: impl ParseOperation<T3>,
    parse4: impl ParseOperation<T4>,
    parse5: impl ParseOperation<T5>,
    parse6: impl ParseOperation<T6>,
) -> Box<dyn ParseOperation<(T1, T2, T3, T4, T5, T6)>> { todo!() }

pub fn seq7<T1: 'static, T2: 'static, T3: 'static, T4: 'static, T5: 'static, T6: 'static, T7: 'static>(
    parse1: impl ParseOperation<T1>,
    parse2: impl ParseOperation<T2>,
    parse3: impl ParseOperation<T3>,
    parse4: impl ParseOperation<T4>,
    parse5: impl ParseOperation<T5>,
    parse6: impl ParseOperation<T6>,
    parse7: impl ParseOperation<T7>,
) -> Box<dyn ParseOperation<(T1, T2, T3, T4, T5, T6, T7)>> { todo!() }

/// Parses the first successful expression in a list of expressions.
/// 
/// All parse functions must return the same type.
#[macro_export]
macro_rules! choice {
    ($($choices:expr),*) => {
        $crate::parser::primitives::choice(vec![$($choices),*])
    };
}

pub fn choice<T: 'static>(choices: Vec<impl ParseOperation<T>>) -> Box<dyn ParseOperation<T>> { todo!() }

/// Parses zero or more instances of an expression.
/// 
/// The yielded value is a vector of all parsed instances.
pub fn repeat_zero<T: 'static>(parse: impl ParseOperation<T>) -> Box<dyn ParseOperation<Vec<T>>> { todo!() }

/// Parses one or more instances of an expression.
/// 
/// The yielded value is a vector of all parsed instances.
pub fn repeat_one<T: 'static>(parse: impl ParseOperation<T>) -> Box<dyn ParseOperation<Vec<T>>> { todo!() }

/// Parses an expression where it can either be present or not present.
/// 
/// The yielded value is an `Option` containin either the parsed value
/// or `None` if the value could not be parsed.
pub fn opt<T: 'static>(parse: impl ParseOperation<T>) -> Box<dyn ParseOperation<Option<T>>> { todo!() }

/// Parses an expression without consuming characters.
/// 
/// If the expression is successfully parsed, nothing happens and an empty tuple is yielded.
/// 
/// If the expression fails to parse, this expression will also fail.
/// 
/// This is useful for ensuring that an expression is followed by another expression.
pub fn and<T: 'static>(parse: impl ParseOperation<T>) -> Box<dyn ParseOperation<()>> { todo!() }

/// Ensures that an expression cannot be parsed at the current position,
/// without consuming characters.
/// 
/// If the expression is successfully parsed, this expression will fail.
/// 
/// If the expression fails to parse, nothing happens and an empty tuple is yielded.
/// 
/// This is useful for ensuring that an expression is NOT followed by another expression.
pub fn not<T: 'static>(parse: impl ParseOperation<T>) -> Box<dyn ParseOperation<()>> { todo!() }
