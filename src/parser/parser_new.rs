use core::any::TypeId;
use core::marker::PhantomData;
use super::lexer::Token;
use core::any::Any;
use std::collections::HashMap;
use std::path::Path;
use crate::core::DiagResult;
use crate::syntax::Syntax;

/// A parser is a container around a particular syntax type to parse
pub struct Parser<T: Syntax> {
    _phantom: PhantomData<T>,
}

impl<T: Syntax> Parser<T> {
    pub fn new() -> Parser<T> {
        Parser { _phantom: PhantomData }
    }

    pub fn parse(&self, module_path: &'static Path, text: String) -> DiagResult<T> {
        let state = ParseState::new(module_path, text);
        match state.bk_memo::<T>(TypeId::of::<T>(), T::parse_func()) {
            ParseResult::Success { value, .. } => DiagResult::ok(value),
            ParseResult::Fail { expected, actual } => todo!(),
        }
    }
}

/// Identifies a particular "parsing position" for memoization. This includes:
/// 1. The ID of a syntax type being parsed
/// 2. A position in the file text
#[derive(Eq, Hash, PartialEq)]
struct ParseMemoKey(TypeId, usize);

pub struct ParseState {
    /// Offset from the beginning of the file (used for reading and backtracking)
    position: usize,
    /// Path of the file being parsed (for token generation)
    module_path: &'static Path,
    /// Offset of the current line being parsed (for token generation)
    line: usize,
    /// Offset within the current line (for token generation)
    column: usize,
    /// Full text of the module file being parsed
    chars: Vec<char>,
    /// Cache for memoization
    memo_cache: HashMap<ParseMemoKey, ParseResult<Box<dyn Any>>>,
}

impl ParseState {
    pub fn new(module_path: &'static Path, text: String) -> ParseState {
        ParseState {
            position: 0,
            module_path,
            line: 1,
            column: 1,
            chars: text.chars().collect(),
            memo_cache: HashMap::new()
        }
    }

    /// Calls the provided function with bookkeeping wrapped around it.
    /// This ensures that a failed result properly backtracs the parser to
    /// the point it was at before the function was called.
    pub fn bk<T: Any>(&mut self, op: Box<dyn ParseOperation<T>>) -> ParseResult<T> {
        let current = self.position;
        let result = op(&mut self);
        if let ParseResult::Fail { .. } = result {
            self.position = current;
        }
        result
    }

    /// Similar to `bk()`, but also uses the memoization cache.
    /// This will check the memoization cache before calling the function,
    /// returning an existing result if it exists and automatically
    /// advancing the parser.
    /// If there is no existing value, the result of the function
    /// will be stored in the cache.
    pub fn bk_memo<T: Syntax>(&mut self, id: TypeId, fun: Box<dyn ParseOperation<T>>) -> ParseResult<T> {
        let key = ParseMemoKey(id, self.position);
        if let Some(result) = self.memo_cache.get(&key) {
            match result {
                ParseResult::Success { size, value } => {
                    self.advance(*size);
                    ParseResult::Success {
                        value: *value.downcast().expect(&format!("Downcast failed: expected {:?}, received {:?}", TypeId::of::<T>(), value.type_id())),
                        size: *size
                    }
                },
                ParseResult::Fail { expected, actual } => ParseResult::Fail { expected: *expected, actual: *actual }
            }
        } else {
            let result = self.bk(fun);
            self.memo_cache.insert(key, result.upcast());
            result
        }
    }

    /// Grabs the next character from the list and advances the following:
    /// * The file position by 1
    /// * The current line by 1 if the character was a `\n`
    /// * The current column by 1 if the character was not a `\n`, or reset to 1 if it was a `\n`
    pub fn next(&mut self) -> Option<char> {
        let &c = self.chars.get(self.position)?;
        self.position += 1;
        if c == '\n' {
            self.line += 1;
            self.column = 1;
        } else {
            self.column += 1;
        }
        Some(c)
    }

    /// Advances the internal iterator by the specified amount of characters.
    /// This is meant to be called internally only.
    fn advance(&mut self, count: usize) {
        self.position += count;
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
pub trait ParseOperation<T: Any> = Fn(&mut ParseState) -> ParseResult<T>;
//pub trait ParseOperation<T: Any> : Fn(&mut ParseState) -> ParseResult<T> {}
/*pub trait ParseOperation<T: Any> {
    fn perform(&self, state: &mut ParseState) -> ParseResult<T>;
}*/

pub enum ParseResult<T: Any> {
    Success {
        value: T,
        size: usize,
    },
    Fail {
        expected: String,
        actual: Option<Token>,
    },
}

impl<T: Any> ParseResult<T> {
    /// Converts this ParseResult to one 
    pub fn upcast(&self) -> ParseResult<Box<dyn Any>> {
        match self {
            ParseResult::Success { value, size } => ParseResult::Success { value: box *value, size: *size },
            ParseResult::Fail { expected, actual } => ParseResult::Fail { expected: *expected, actual: *actual }
        }
    }
}

impl ParseResult<Box<dyn Any>> {
    pub fn downcast<T: Any>(&self) -> ParseResult<T> {
        match self {
            ParseResult::Success { size, value } => ParseResult::Success {
                value: *value.downcast().expect(&format!("Downcast failed: expected {:?}, received {:?}", TypeId::of::<T>(), value.type_id())),
                size: *size
            },
            ParseResult::Fail { expected, actual } => ParseResult::Fail { expected: *expected, actual: *actual }
        }
    }
}
