use super::lexer::Token;
use std::{path::Path, str::Chars, collections::HashMap, any::Any};
use crate::{core::DiagResult, utils::backtrack_iter::BacktrackIterator, syntax::Syntax};

pub struct Parser {
    next_id: usize,
}

impl Parser {
    pub fn new() -> Parser {
        Parser { next_id: 0 }
    }

    pub fn parse<T: Syntax>(&self, tokens: BacktrackIterator<Chars<'static>>) -> DiagResult<T> {
        let func = T::non_terminal(&self);
    }
}

/// A file position and a parse function key
struct ParseMemoKey(usize, usize);

pub struct ParseState {
    /// Offset from the beginning of the file (used for backtracking)
    position: usize,
    /// Path of the file being parsed (for token generation)
    module_path: &'static Path,
    /// Offset of the current line being parsed (for token generation)
    line: usize,
    /// Offset within the current line (for token generation)
    column: usize,
    /// Backtrackable iterator of characters for parsing
    iterator: BacktrackIterator<Chars<'static>>,
    /// Cache for memoization
    memo_cache: HashMap<ParseMemoKey, ParseResult<dyn Any>>,
}

impl ParseState {
    pub fn new(module_path: &'static Path, iterator: BacktrackIterator<Chars<'static>>) -> ParseState {
        ParseState {
            position: 0,
            module_path,
            line: 1,
            column: 1,
            iterator,
            memo_cache: HashMap::new()
        }
    }

    /// Calls the provided function with bookkeeping wrapped around it.
    /// This ensures that a failed result properly backtracs the parser to
    /// the point it was at before the function was called.
    pub fn bk<T: Any>(&mut self, fun: ParseFunc<T>) -> ParseResult<T> {
        let current = self.position;
        let result = fun(self);
        if let Err(_) = result {
            self.iterator.backtrack(self.position - current);
        }
        result;
    }

    /// Similar to `bk()`, but also uses the memoization cache.
    /// This will check the memoization cache before calling the function,
    /// returning an existing result if it exists and automatically
    /// advancing the parser.
    /// If there is no existing value, the result of the function
    /// will be stored in the cache.
    pub fn bk_memo<T: Any>(&mut self, id: usize, fun: ParseFunc<T>) -> ParseResult<T> {
        let key = ParseMemoKey(self.position, id);
        if let Some(result) = self.memo_cache.get(key) {
            if let ParseResult::Success { size, .. } = result {
                self.advance(size);
            }
            result
        } else {
            let result = self.bk(fun);
            self.memo_cache.insert(key, result);
            result
        }
    }

    /// Grabs the next character from the iterator and advances the following:
    /// * The file position by 1
    /// * The current line by 1 if the character was a `\n`
    /// * The current column by 1 if the character was not a `\n`, or reset to 1 if it was a `\n`
    pub fn next(&mut self) -> Option<char> {
        match self.iterator.next() {
            Some(c) => {
                self.position += 1;
                if c == '\n' {
                    self.line += 1;
                    self.column = 1;
                } else {
                    self.column += 1;
                }
                Some(c)
            },
            _ => None,
        }
    }

    /// Advances the internal iterator by the specified amount of characters.
    /// This is meant to be called internally only.
    fn advance(&mut self, count: usize) {
        for i in 0..count {
            self.next();
        }
    }
}

/// A function that performs a parse operation using a parser,
/// returning a value of a specified type (or optionally, no value if the operation failed).
/// 
/// Each parse function's reponsibility is to:
/// 1. Record the current file position before parsing
/// 2. Perform the parse operation
/// 3. If the parse was successful, return a resulting value
/// 4. If the parse failed, backtrack the character iterator
///    back to the original file position and return `None`
pub type ParseFunc<T: Any> = Box<dyn Fn(&mut ParseState) -> ParseResult<T>>;

pub enum ParseResult<T: Any> {
    Success {
        value: T,
        size: usize,
    },
    Fail {
        expected: Option<String>,
        actual: Option<Token>,
    },
}

/// Parses a terminal symbol, yielding a string.
pub fn term(terminal: &str) -> ParseFunc<String> {
    // The basic idea is that we check 
    box |parser| {
        let current_position = parser.position;
        let s = String::new();
        for ch in terminal.chars() {
            if let Some(actual) = parser.next() {
                if actual == ch { s.push(actual); }
                else {
                    parser.backtrack_to(current_position);
                    return None;
                }
            } else {
                parser.backtrack_to(current_position);
                return None;
            }
        }
    }
}

/// Parses a single character within the specified character range, yielding that character.
pub fn chars(start: char, end: char) -> ParseFunc<char> { todo!() }

/// Parses a `Token`, converting the resulting `String` to a `Token`.
pub fn tok(parse: ParseFunc<String>) -> ParseFunc<Token> { todo!() }

/// Parses the end of the file.
pub fn eof() -> ParseFunc<()> { todo!() }

/// Parses the end of a line (OS-sensitive).
pub fn eol() -> ParseFunc<String> { todo!() }

/// Parses a sequence of expressions.
/// 
/// This macro calls a different underlying function depending on the number of expressions
/// in the sequence.
/// 
/// The yielded value is a tuple containing the fully-parsed sequence.
macro_rules! seq {
    ($e1:expr, $e2:expr) => ($crate::parser::primitives::seq2($e1, $e2));
    ($e1:expr, $e2:expr, $e3:expr) => ($crate::parser::primitives::seq3($e1, $e2, $e3));
    ($e1:expr, $e2:expr, $e3:expr, $e4:expr) => ($crate::parser::primitives::seq4($e1, $e2, $e3, $e4));
    ($e1:expr, $e2:expr, $e3:expr, $e4:expr, $e5:expr) => ($crate::parser::primitives::seq5($e1, $e2, $e3, $e4, $e5));
    ($e1:expr, $e2:expr, $e3:expr, $e4:expr, $e5:expr, $e6:expr) => ($crate::parser::primitives::seq6($e1, $e2, $e3, $e4, $e5, $e6));
    ($e1:expr, $e2:expr, $e3:expr, $e4:expr, $e5:expr, $e6:expr, $e7:expr) => ($crate::parser::primitives::seq7($e1, $e2, $e3, $e4, $e5, $e6, $e7));
}

pub fn seq2<T1, T2>(
    parse1: ParseFunc<T1>,
    parse2: ParseFunc<T2>,
) -> ParseFunc<(T1, T2)> { todo!() }

pub fn seq3<T1, T2, T3>(
    parse1: ParseFunc<T1>,
    parse2: ParseFunc<T2>,
    parse3: ParseFunc<T3>,
) -> ParseFunc<(T1, T2, T3)> { todo!() }

pub fn seq4<T1, T2, T3, T4>(
    parse1: ParseFunc<T1>,
    parse2: ParseFunc<T2>,
    parse3: ParseFunc<T3>,
    parse4: ParseFunc<T4>,
) -> ParseFunc<(T1, T2, T3, T4)> { todo!() }

pub fn seq5<T1, T2, T3, T4, T5>(
    parse1: ParseFunc<T1>,
    parse2: ParseFunc<T2>,
    parse3: ParseFunc<T3>,
    parse4: ParseFunc<T4>,
    parse5: ParseFunc<T5>,
) -> ParseFunc<(T1, T2, T3, T4, T5)> { todo!() }

pub fn seq6<T1, T2, T3, T4, T5, T6>(
    parse1: ParseFunc<T1>,
    parse2: ParseFunc<T2>,
    parse3: ParseFunc<T3>,
    parse4: ParseFunc<T4>,
    parse5: ParseFunc<T5>,
    parse6: ParseFunc<T6>,
) -> ParseFunc<(T1, T2, T3, T4, T5, T6)> { todo!() }

pub fn seq7<T1, T2, T3, T4, T5, T6, T7>(
    parse1: ParseFunc<T1>,
    parse2: ParseFunc<T2>,
    parse3: ParseFunc<T3>,
    parse4: ParseFunc<T4>,
    parse5: ParseFunc<T5>,
    parse6: ParseFunc<T6>,
    parse7: ParseFunc<T7>,
) -> ParseFunc<(T1, T2, T3, T4, T5, T6, T7)> { todo!() }

/// Parses the first successful expression in a list of expressions.
/// 
/// All parse functions must return the same type.
macro_rules! choice {
    ($($choices:expr),*) => {
        $crate::parser::primitives::choice(vec![$($choices),*])
    };
}

pub fn choice<T>(choices: Vec<ParseFunc<T>>) -> ParseFunc<T> { todo!() }

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
pub fn repeat<T>(parse: ParseFunc<T>, base: RepeatBase) -> ParseFunc<Vec<T>> { todo!() }

/// Parses an expression where it can either be present or not present.
/// 
/// The yielded value is an `Option` containin either the parsed value
/// or `None` if the value could not be parsed.
pub fn opt<T>(parse: ParseFunc<T>) -> ParseFunc<Option<T>> { todo!() }

/// Parses an expression without consuming characters.
/// 
/// If the expression is successfully parsed, nothing happens and an empty tuple is yielded.
/// 
/// If the expression fails to parse, this expression will also fail.
/// 
/// This is useful for ensuring that an expression is followed by another expression.
pub fn and<T>(parse: ParseFunc<T>) -> ParseFunc<()> { todo!() }

/// Ensures that an expression cannot be parsed at the current position,
/// without consuming characters.
/// 
/// If the expression is successfully parsed, this expression will fail.
/// 
/// If the expression fails to parse, nothing happens and an empty tuple is yielded.
/// 
/// This is useful for ensuring that an expression is NOT followed by another expression.
pub fn not<T>(parse: ParseFunc<T>) -> ParseFunc<()> { todo!() }
