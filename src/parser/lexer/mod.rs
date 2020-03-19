use std::fs;
use std::io::{self, Read};
use std::{path::PathBuf, str::Chars};
use crate::core::{Diagnostic, FilePosition};
use crate::utils::backtrack_iter::{IteratorExt, BacktrackIterator};

pub use token::{TokenType, Token};

mod token;

// #region Token/character sets

/// Full list of identifiers that are classified as reserved words
pub const RESERVED: [&str; 45] = [
    "as",       // used for renaming imports
    "any",      // supertype of all types
    "bool",     // boolean type name
    "break",    // statement to break from a loop
    "byte",     // byte type name (alias of u8)
    "catch",    // denotes a catch block in a try-catch block
    "char",     // character type name
    "const",    // constant declaration keyword
    "continue", // statement to skip to the next iteration of a loop
    "default",  // used to declare a default export, also for a default case in a pattern match block
    "do",       // denotes the start of a do-while loop
    "double",   // double type name (alias for f64)
    "else",     // denotes the start of an else clause
    "export",   // declares a module export
    "f32",      // 32-bit floating point type (equivalent to "float")
    "f64",      // 64-bit floating point type (equivalent to "double")
    "false",    // boolean false value
    "finally",  // denotes a finally block in a try-catch-finally block
    "float",    // float type name (alias for f32)
    "for",      // denotes the start of a for loop
    "from",     // used in import and export declarations to specify the name of another module
    "func",     // denotes a named function declaration
    "i16",      // 16 bit signed integer type
    "i32",      // 32 bit signed integer type (equivalent to "int")
    "i64",      // 64 bit signed integer type (equivalent to "long")
    "i8",       // 8 bit signed integer type
    "if",       // denotes the start of an if block
    "import",   // declares a module import
    "in",       // separates iterator variable and iterable expression in for statements
    "int",      // int type name (alias for i32)
    "integer",  // integer type name (true integer, infinite capacity)
    "long",     // long type name (alias for i64)
    "return",   // denotes a return statement to return a value from a function
    "short",    // short type name (alias for u16)
    "string",   // string type name
    "throw",    // denotes a throw statement to throw an exception from a function
    "true",     // boolean true value
    "try",      // denotes the start of a try-catch block
    "type",     // denotes the start of a type declaration
    "u16",      // 16 bit unsigned integer type (equivalent to "short")
    "u32",      // 32 bit unsigned integer type
    "u64",      // 64 bit unsigned integer type
    "u8",       // 8 bit unsigned integer type (equivalent to "byte")
    "void",     // return type of functions, indicates no value is returned (alias for "()")
    "while",    // denotes the start of a while loop
];

/// Operators are dynamic tokens that serve a semantic purpose.
/// They can be composed of any combination of these characters,
/// except when that combination matches a symbol.
const OPER_CHARS: &str = "~!$%^&*+-=|<>?/";

/// Anything that matches one of these symbols is parsed as a SYMBOL,
/// except when one of the symbols contains an OPER_CHARS character.
/// In that case, the symbol must be followed by a non-OPER_CHARS character.
const RESERVED_SYMBOLS: [&str; 13] = [
    ":",  // colon separates value names from their types, and also serves as a general delimiter
    "{",  // braces wrap struct literals and body statements
    "}",
    "(",  // parentheses wrap tuple literals and serve as explicit delimiters for types and expressions
    ")",
    "[",  // brackets wrap array literals and are used for index expressions
    "]",
    ",",  // commas separate lists of syntax elements
    "=",  // equals sign is used to assign values to variables
    "=>", // fat arrow is used to separate a lambda function"s parameter list from its body
    "`",  // backticks are not yet used in the language, but may have a way to use named functions as operators
    ".",  // dots are used in field access expressions and other related operations
    ";",  // semicolons are used to explicitly separate statements that exist on the same line
];

// types of tokens that are ignored by the parser
const IGNORED_TYPES: [TokenType; 2] = [TokenType::Comment, TokenType::Whitespace];

// #endregion

// #region Token stream logic

/// An iterator for a `Token` stream.
/// 
/// Each yielded item will be one of the following:
/// * a `Some(Ok(Token))` if a `Token` could be validly consumed
/// * a `Some(Err(Diagnostic))` if a `Token` could not be consumed
/// * a `None` if all characters have been consumed or there was previously an error
pub struct Tokens<'a> {
    position: FilePosition,
    terminated: bool,
    chars: BacktrackIterator<Chars<'a>>,
}

impl<'a> Iterator for Tokens<'a> {
    type Item = Result<Token, Diagnostic>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.terminated { None }
        else { self.consume_token() }
    }
}

impl Tokens<'_> {
    /// Reads a stream of characters from the file at the specified path and performs lexical analysis on the stream,
    /// returning a stream of tokens.
    pub fn from_file_path(path: PathBuf) -> io::Result<impl Iterator<Item = Result<Token, Diagnostic>>>
    {
        let tokens = Self::from_file_path_no_ignore(path)?
            .filter(|t| t.is_ok() && !IGNORED_TYPES.contains(t.unwrap().token_type()));
        Ok(tokens)
    }

    /// Same as `from_file_path`, but does not ignore whitespace and comments.
    pub fn from_file_path_no_ignore<'a>(path: PathBuf) -> io::Result<Tokens<'a>> {
        let file = fs::File::open(path)?;
        let string = String::new();
        file.read_to_string(&mut string)?;
        Ok(Tokens {
            chars: string.chars().backtrack(),
            terminated: false,
            position: FilePosition::new(path, (0, 0))
        })
    }

    /// Consumes a single token from the front of the stream and returns it.
    /// 
    /// If there was a lexical error, that will be returned instead.
    fn consume_token(&self) -> Option<Result<Token, Diagnostic>> {
        if self.terminated { panic!("consume_token() should not be called after it yields an EOF") }

        match self.look2() {
            // eof()
            (None, _) => {
                self.terminated = true;
                Some(Ok(Token::new(TokenType::Eof, self.position.clone())))
            }
            // seq(ch('/'), ch('/'), repeat(any(), ZeroPlus), eol())
            (Some('/'), Some('/')) =>
                self.consume_single_line_comment(),
            // multi_line_comment() (custom implementation)
            (Some('/'), Some('*')) =>
                self.consume_multi_line_comment(),
            // seq(<ident_start>, repeat(select(<ident>), OnePlus))
            /*(Some(c), _) if is_ident(c) =>
                self.consume_identifier_or_reserved(),
            // 
            (Some(c), _) if kind(c) == CharKind::Num =>
                self.consume_number(),
            // seq('"', repeat(not))
            (Some(c), _) if c == '"' =>
                self.consume_string_literal(),
            //
            (Some(c), _) if c == '\'' =>
                self.consume_char_literal(),
            //
            (Some(c), _) if is_reserved_sym(c) =>
                self.consume_symbol(),
            //
            (Some(c), _) if is_oper(c) =>
                self.consume_operator(),
            //
            (Some(c), c1) if is_newline(c, c1) =>
                self.consume_newline(),
            //
            (Some(c), _) if c == ' ' || c == '\t' =>
                self.consume_whitespace(),*/
            //
            (Some(c), _) => Some(Err(Diagnostic::new(
                format!("Invalid character '{}'", c),
                self.position.compute_range("")
            )))
        }
    }

    /// Peeks at the next 2 characters and returns them in a tuple.
    fn look2(&self) -> (Option<char>, Option<char>) {
        let peek = self.chars.peeks(2);
        (peek[0].copied(), peek[1].copied())
    }

    /// Advance the internal file position of this Tokens instance by one character.
    /// This is used to compute the position of each Token.
    /// 
    /// This should be the **only** place that we call `self.chars.next()`.
    fn advance(&self, ch: char) {
        self.chars.next();
        if ch == '\n' {
            self.position.next_line();
        } else {
            self.position.next_column();
        }
    }

    /// Advances the iterator and pushes the character onto the end of the specified Token.
    fn advance_token(&self, token: &Token, ch: char) {
        token.push_char(ch);
        self.advance(ch);
    }

    /// A single line comment is an ignored area of code delimited by a '//' sequence at the start
    /// and a new line (or the end of the file) at the end.
    /// 
    /// Consuming a single line comment cannot fail, because by definition, it can contain any character.
    fn consume_single_line_comment(&mut self) -> Option<Result<Token, Diagnostic>> {
        let token = Token::new(TokenType::Comment, self.position.clone());
        while let Some(req) = self.chars.request() {
            let ch = req.accept();
            token.push_char(ch);
            if ch == '\n' { break; }
        }
        Some(Ok(token))
    }

    /// A multi line comment is an ignored area of code delimited by a '/\*' (no backslash) sequence at the start
    /// and a '*\/' (no backslash) sequence at the end.
    /// 
    /// Multi-line comments must be terminated. If it is not, an error is produced.
    fn consume_multi_line_comment(&mut self) -> Option<Result<Token, Diagnostic>> {
        let token = Token::new(TokenType::Comment, self.position.clone());
        let first = self.chars.peeks(2);
        // the first two have been checked already
        self.advance_token(&token, *first[0].unwrap());
        self.advance_token(&token, *first[1].unwrap());
        let mut terminated = false;
        while let Some(ch) = self.chars.peek() {
            self.advance_token(&token, *ch);
            if *ch == '*' {
                if let Some(&'/') = self.chars.peek() {
                    self.advance_token(&token, '/');
                    break;
                }
            }
        }
        Some(Ok(token))
    }
}
/*

// #region Consumers

enum MutliLineCommentState {
    START,     // only the first '/' consumed
    BODY,      // '/ *' consumed
    MAYBE_END, // a '*' is consumed in the body
}

/// A multi line comment is an ignored area of code delimited by a '/\*' (no backslash) sequence at the start
/// and a '*\/' (no backslash) sequence at the end.
function consumeMultiLineComment(pending: LexerState, state = MutliLineCommentState.START): LexerState {
    // we can't use ifHasNext() here because a) we need tail recursion b) we have a state parameter
    if (pending.empty) throw new BoxError(new Diagnostic("Unterminated comment", pending.stream.position));
    const first = pending.stream.first();
    let nextState = state;
    if (state === MutliLineCommentState.START) {
        state = MutliLineCommentState.BODY;
    } else if (state === MutliLineCommentState.BODY) {
        if (first === '*') state = MutliLineCommentState.MAYBE_END;
    } else if (state === MutliLineCommentState.MAYBE_END) {
        if (first === '/') return pending.consume();
        state = MutliLineCommentState.BODY
    }
    return consumeMultiLineComment(pending.consume(), nextState);
}

/// An identifier is a sequence of alphanumeric characters and '_' (but can't start with a number)
/// that serves as the name of a code element such as a variable or type.
/// Some valid identifier sequences are reserved words in the language, and these
/// are parsed as RESERVED tokens instead of IDENT tokens.
function consumeIdentifierOrReserved(pending: LexerState): LexerState {
    return pending.ifHasNext(1, ([c]) => ["upper", "lower", "num", "_"].includes(kind(c)), consumeIdentifierOrReserved)
        .else(state => RESERVED.includes(state.image) ? state.setType(TokenType.RESERVED) : state.setType(TokenType.IDENT));
}

/// Consume either: hex, binary, float, decimal
function consumeNumber(pending: LexerState): LexerState {
    if (pending.image === '0') {
        return pending
            .ifHasNext(2, ([c1, c2]) => c1.toLowerCase() === 'x' && isHex(c2),
                state => consumeHexLiteral(state.setType(TokenType.INTEGER_LITERAL)))
            .elseIf(2, ([c1, c2]) => c1.toLowerCase() === 'b' && "01".includes(c2),
                state => consumeBinLiteral(state.setType(TokenType.INTEGER_LITERAL)))
            .elseIf(2, ([c1, c2]) => ".e".includes(c1.toLowerCase()) && kind(c2) === "num",
                (state, img) => consumeFloatLiteral(state.setType(TokenType.FLOAT_LITERAL),
                    img[0] === '.' ? FloatLiteralState.FRACTION : FloatLiteralState.EXPONENT))
            .else(consumeDecLiteral);
    }
    return consumeDecLiteral(pending);
}

/// Hexadecimal literals: 0[xX][0-9a-fA-F]+
function consumeHexLiteral(pending: LexerState): LexerState {
    return pending.ifHasNext(1, ([c]) => isHex(c), consumeHexLiteral).else(state => state.setValue(parseHex));
}

/// Binary literals: 0[bB][01]+
function consumeBinLiteral(pending: LexerState): LexerState {
    return pending.ifHasNext(1, ([c]) => "01".includes(c), consumeBinLiteral).else(state => state.setValue(parseBin));
}

enum FloatLiteralState {
    FRACTION,       // segment after the decimal point
    EXPONENT,       // segment after the 'e'
}

/// Float literals: whole number portion + (fractional portion and/or exponent portion)
function consumeFloatLiteral(pending: LexerState, state: FloatLiteralState): LexerState {
    if (state === FloatLiteralState.FRACTION) {
        return pending
            .ifHasNext(2, ([c1, c2]) => c1.toLowerCase() === 'e' && kind(c2) === "num",
                s => consumeFloatLiteral(s, FloatLiteralState.EXPONENT))
            .elseIf(1, ([c]) => kind(c) === "num", 
                s => consumeFloatLiteral(s, state))
            .else(s => s.setValue(parseFloat));
    } else {
        return pending.ifHasNext(1, ([c]) => kind(c) === "num", s => consumeFloatLiteral(s, state))
            .else(s => s.setValue(parseFloat));
    }
}

/// Decimal literals: sequence of numbers
function consumeDecLiteral(pending: LexerState): LexerState {
    return pending
        .ifHasNext(2, ([c1, c2]) => ".e".includes(c1.toLowerCase()) && kind(c2) === "num",
            (state, img) => consumeFloatLiteral(state,
                img[0] === '.' ? FloatLiteralState.FRACTION : FloatLiteralState.EXPONENT))
        .elseIf(1, ([c]) => kind(c) === "num", consumeDecLiteral)
        .else(state => state.setValue(parseInt));
}

const ESCAPE: { readonly [key: string]: string } = { n: '\n', r: '\r', t: '\t', f: '\f', b: '\b', v: '\v' };

/// Literals of character sequences
function consumeStringLiteral(pending: LexerState): LexerState {
    if (pending.empty) throw new BoxError(new Diagnostic("Unterminated string", pending.stream.position));
    const next = pending
        // end of string
        .ifHasNext(1, ([c]) => c === '"', state => state)
        // basic escape codes
        .elseIf(2, ([c1, c2]) => c1 === '\\' && "nrtfbv".includes(c2),
            (state, cs) => state.mapValue(v => v + ESCAPE[cs[1]]))
        // ascii escape codes
        .elseIf(4, ([c1, c2, c3, c4]) => c1 === '\\' && c2.toLowerCase() === 'x' && isHex(c3) && isHex(c4),
            (state, cs) => state.mapValue(v => v + String.fromCodePoint(parseInt(cs.last(2), 16))))
        // 4-byte unicode escape codes
        .elseIf(6, ([c1, c2, ...cs]) => c1 === '\\' && c2.toLowerCase() === 'u' && cs.every(isHex),
            (state, cs) => state.mapValue(v => v + String.fromCodePoint(parseInt(cs.last(4), 16))))
        // 5-byte unicode escape codes
        .elseIf(9, ([c1, c2, ...cs]) => c1 === '\\' && c2.toLowerCase() === 'u' && cs[0] === '{' && cs[6] === '}' && cs.slice(1, 6).every(isHex),
            (state, cs) => state.mapValue(v => v + String.fromCodePoint(parseInt(cs.slice(3, 9), 16))))
        // 6-byte unicode escape codes
        .elseIf(10, ([c1, c2, ...cs]) => c1 === '\\' && c2.toLowerCase() === 'u' && cs[0] === '{' && cs[7] === '}' && cs.slice(1, 7).every(isHex),
            (state, cs) => state.mapValue(v => v + String.fromCodePoint(parseInt(cs.slice(3, 10), 16))))
        // all other escaped characters
        .elseIf(2, ([c]) => c === '\\', (state, cs) => state.mapValue(v => v + cs[1]))
        // all other characters
        .elseIf(1, () => true, (state, c) => state.mapValue(v => v + c))
        // the last case was a catch-all, so we can guarantee that this will be non-null
        .result!;
    const last = next.image.last(2);
    if (last[0] !== '\\' && last[1] === '"') return next;
    return consumeStringLiteral(next);
}

/// Literals of single characters
function consumeCharLiteral(pending: LexerState): LexerState {
    if (pending.empty) throw new BoxError(new Diagnostic("Unterminated character", pending.stream.position));
    const next = pending
        .ifHasNext(1, ([c]) => c === "'",
            () => { throw new BoxError(new Diagnostic("Empty character", pending.stream.position)) })
        // basic escape codes
        .elseIf(2, ([c1, c2]) => c1 === '\\' && "nrtfbv".includes(c2),
            (state, cs) => state.setValue(() => ESCAPE[cs[1]]))
        // ascii escape codes
        .elseIf(4, ([c1, c2, c3, c4]) => c1 === '\\' && c2.toLowerCase() === 'x' && isHex(c3) && isHex(c4),
            (state, cs) => state.setValue(() => String.fromCodePoint(parseInt(cs.last(2), 16))))
        // 4-byte unicode escape codes
        .elseIf(6, ([c1, c2, ...cs]) => c1 === '\\' && c2.toLowerCase() === 'u' && cs.every(isHex),
            (state, cs) => state.setValue(() => String.fromCodePoint(parseInt(cs.last(4), 16))))
        // 5-byte unicode escape codes
        .elseIf(9, ([c1, c2, ...cs]) => c1 === '\\' && c2.toLowerCase() === 'u' && cs[0] === '{' && cs[6] === '}' && cs.slice(1, 6).every(isHex),
            (state, cs) => state.setValue(() => String.fromCodePoint(parseInt(cs.slice(3, 9), 16))))
        // 6-byte unicode escape codes
        .elseIf(10, ([c1, c2, ...cs]) => c1 === '\\' && c2.toLowerCase() === 'u' && cs[0] === '{' && cs[7] === '}' && cs.slice(1, 7).every(isHex),
            (state, cs) => state.setValue(() => String.fromCodePoint(parseInt(cs.slice(3, 10), 16))))
        // all other escaped characters
        .elseIf(2, ([c]) => c === '\\', (state, cs) => state.setValue(() => cs[1]))
        // all other characters
        .elseIf(1, () => true, (state, c) => state.setValue(() => c))
        // the last case was a catch-all, so we can guarantee that this will be non-null
        .result!;
    // the next character must absolutely be a ' and nothing else
    return next
        .ifHasNext(1, ([c]) => c == "'", state => state)
        .else(() => { throw new BoxError(new Diagnostic("Unterminated character", next.stream.position)) });
}

function consumeSymbol(pending: LexerState): LexerState {
    // equals is a special case because it's dumb (can be present in both symbols and operators)
    if (pending.image === '=') {
        return pending
            .ifHasNext(1, ([c]) => c === '>', state => state
                // oper following =>, definitely oper
                .ifHasNext(1, ([c]) => OPER_CHARS.includes(c), s => consumeOperator(s.setType(TokenType.OPER)))
                // empty or non-oper following =>, definitely symbol
                .else(s => s))
            // oper following =, definitely oper
            .elseIf(1, ([c]) => OPER_CHARS.includes(c), state => consumeOperator(state.setType(TokenType.OPER)))
            // empty or non-oper following =, definitely symbol
            .else(state => state);
    }
    // all of our other symbols today are only one character long, so we're already good (for now)
    return pending;
}

function consumeOperator(pending: LexerState): LexerState {
    // < and > have special behavior in the parser, so we tokenize them individually
    if (pending.image === '<' || pending.image === '>') return pending;
    // continue to consume oper chars until there aren't anymore
    return pending.ifHasNext(1, ([c]) => OPER_CHARS.includes(c), consumeOperator)
        .else(state => state);
}

function consumeWhitespace(pending: LexerState): LexerState {
    return pending.ifHasNext(1, ([c]) => " \t".includes(c), consumeWhitespace)
        .else(state => state);
}

// #endregion

// #region Helpers

function kind(char: string) {
    if (char >= 'a' && char <= 'z') return "lower";
    else if (char >= 'A' && char <= 'Z') return "upper";
    else if (char >= '0' && char <= '9') return "num";
    else return char;
}

function isHex(c: string) {
    if (!c) return false;
    const low = c.toLowerCase();
    return (c >= '0' && c <= '9') || (low >= 'a' && low <= 'f');
}

function parseHex(image: string) {
    return parseInt(image, 16);
}

function parseBin(image: string) {
    return parseInt(image.replace("/0b/i", ""), 2);
}

// #endregion
*/

#[derive(PartialEq)]
enum CharKind {
    Upper,
    Lower,
    Num,
    Other(char)
}

fn kind(ch: char) -> CharKind {
    match ch {
        'A'..='Z' => CharKind::Upper,
        'a'..='z' => CharKind::Lower,
        '0'..='9' => CharKind::Num,
        _ => CharKind::Other(ch)
    }
}

/// Returns true if the character is a valid starting character for an identifier
fn is_ident(ch: char) -> bool {
    kind(ch) == CharKind::Upper
        || kind(ch) == CharKind::Lower
        || kind(ch) == CharKind::Other('_')
}

/// Returns true if the character is a valid starting character for a reserved symbol
fn is_reserved_sym(ch: char) -> bool {
    RESERVED_SYMBOLS.iter().any(|s| s.starts_with(ch))
}

/// Returns true if the character can belong to an operator
fn is_oper(ch: char) -> bool {
    OPER_CHARS.contains(ch)
}

/// Returns true if a pair of characters represents a new line
fn is_newline(ch: char, ch1: Option<char>) -> bool {
    ch == '\n' || (ch == '\r' && ch1 == Some('\n'))
}
