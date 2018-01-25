import { LazyList, empty, create } from '~/utils/lazy-list';
import createCharStream, { CharStream } from './char-stream';
import { TokenType, Token } from './token';
import { TokenResult, LexerState } from './lexer-state';
import BoxError from '~/utils/box-error';
import { Diagnostic } from '~/core';


// #region Token/character sets

/**
 * Full list of identifiers that are classified as reserved words
 */
export const RESERVED = [
    'as',       // used for renaming imports
    'any',      // supertype of all types
    'bool',     // boolean type name
    'break',    // statement to break from a loop
    'byte',     // byte type name (alias of u8)
    'catch',    // denotes a catch block in a try-catch block
    'char',     // character type name
    'const',    // constant declaration keyword
    'continue', // statement to skip to the next iteration of a loop
    'default',  // used to declare a default export, also for a default case in a pattern match block
    'do',       // denotes the start of a do-while loop
    'double',   // double type name (alias for f64)
    'else',     // denotes the start of an else clause
    'export',   // declares a module export
    'f32',      // 32-bit floating point type (equivalent to 'float')
    'f64',      // 64-bit floating point type (equivalent to 'double')
    'false',    // boolean false value
    'finally',  // denotes a finally block in a try-catch-finally block
    'float',    // float type name (alias for f32)
    'for',      // denotes the start of a for loop
    'from',     // used in import and export declarations to specify the name of another module
    'func',     // denotes a named function declaration
    'i16',      // 16 bit signed integer type
    'i32',      // 32 bit signed integer type (equivalent to 'int')
    'i64',      // 64 bit signed integer type (equivalent to 'long')
    'i8',       // 8 bit signed integer type
    'if',       // denotes the start of an if block
    'import',   // declares a module import
    'in',       // separates iterator variable and iterable expression in for statements
    'int',      // int type name (alias for i32)
    'integer',  // integer type name (true integer, infinite capacity)
    'long',     // long type name (alias for i64)
    'return',   // denotes a return statement to return a value from a function
    'short',    // short type name (alias for u16)
    'string',   // string type name
    'throw',    // denotes a throw statement to throw an exception from a function
    'true',     // boolean true value
    'try',      // denotes the start of a try-catch block
    'type',     // denotes the start of a type declaration
    'u16',      // 16 bit unsigned integer type (equivalent to 'short')
    'u32',      // 32 bit unsigned integer type
    'u64',      // 64 bit unsigned integer type
    'u8',       // 8 bit unsigned integer type (equivalent to 'byte')
    'void',     // return type of functions, indicates no value is returned (alias for '()')
    'while',    // denotes the start of a while loop
]

/**
 * Operators are dynamic tokens that serve a semantic purpose.
 * They can be composed of any combination of these characters,
 * except when that combination matches a symbol.
 */
const OPER_CHARS = '~!$%^&*+-=|<>?/';

/**
 * Anything that matches one of these symbols is parsed as a SYMBOL,
 * except when one of the symbols contains an OPER_CHARS character.
 * In that case, the symbol must be followed by a non-OPER_CHARS character.
 */
const RESERVED_SYMBOLS = [
    ':',  // colon separates value names from their types, and also serves as a general delimiter
    '{',  // braces wrap struct literals and body statements
    '}',
    '(',  // parentheses wrap tuple literals and serve as explicit delimiters for types and expressions
    ')',
    '[',  // brackets wrap array literals and are used for index expressions
    ']',
    ',',  // commas separate lists of syntax elements
    '=',  // equals sign is used to assign values to variables
    '=>', // fat arrow is used to separate a lambda function's parameter list from its body
    '`',  // backticks are not yet used in the language, but may have a way to use named functions as operators
    '.',  // dots are used in field access expressions and other related operations
    ';',  // semicolons are used to explicitly separate statements that exist on the same line
];

// types of tokens that are ignored by the parser
const IGNORED_TYPES = [TokenType.COMMENT, TokenType.WHITESPACE];

// #endregion

// #region Token stream logic

/**
 * Reads a stream of characters from the file at the specified path and performs lexical analysis on the stream,
 * returning a stream of tokens.
 */
export function createTokenStream(path: string, ignoreMode = true): LazyList<Token> {
    const list = consumeTokens(createCharStream(path));
    if (!ignoreMode) return list;
    return list.filter(t => !IGNORED_TYPES.includes(t.type));
}

/**
 * Consumes a token and recurses until an EOF token is reached
 */
function consumeTokens(charStream: CharStream): LazyList<Token> {
    const { final, remaining } = consumeToken(charStream);
    return create(final, () => final.type === TokenType.EOF ? empty() : consumeTokens(remaining));
}

/**
 * Consumes a single token from the front of the stream and
 * returns the token and the remaining stream
 */
function consumeToken(charStream: CharStream): TokenResult {
    // stream is empty, return the final EOF token
    if (charStream.empty) return { final: Token(TokenType.EOF, charStream.position, ''), remaining: charStream };
    // read a single character from the stream
    const { char, stream } = charStream.read();

    return LexerState(charStream.position, char, stream)
        .ifHasNext(2, ([c1, c2]) => c1 === '/' && c2 === '/',
            state => consumeSingleLineComment(state.setType(TokenType.COMMENT)))
        .elseIf(2, ([c1, c2]) => c1 === '/' && c2 === '*',
            state => consumeMultiLineComment(state.setType(TokenType.COMMENT)))
        .elseIf(1, ([c]) => ['upper', 'lower', '_'].includes(kind(c)), consumeIdentifierOrReserved)
        .elseIf(1, ([c]) => kind(c) === 'num', consumeNumber)
        .elseIf(1, ([c]) => c === '"',
            state => consumeStringLiteral(state.setType(TokenType.STRING_LITERAL).setValue(_ => '')))
        .elseIf(1, ([c]) => c === "'",
            state => consumeCharLiteral(state.setType(TokenType.CHARACTER_LITERAL)))
        .elseIf(1, ([c]) => RESERVED_SYMBOLS.some(s => s.startsWith(c)),
            state => consumeSymbol(state.setType(TokenType.SYMBOL)))
        .elseIf(1, ([c]) => OPER_CHARS.includes(c),
            state => consumeOperator(state.setType(TokenType.OPER)))
        .elseIf(1, ([c]) => c === '\n', state => state.setType(TokenType.NEWLINE))
        .elseIf(2, ([c1, c2]) => c1 === '\r' && c2 === '\n', state => state.setType(TokenType.NEWLINE))
        .elseIf(1, ([c]) => c === ' ' || c === '\t',
            state => consumeWhitespace(state.setType(TokenType.WHITESPACE)))
        .else(() => {
            // otherwise it is not a valid character (for now)
            throw new BoxError(Diagnostic(`Invalid character '${char}'`, charStream.position));
        })
        .finish();
}

// #endregion

// #region Consumers

/**
 * A single line comment is an ignored area of code delimited by a '//' sequence at the start
 * and a new line at the end.
 */
function consumeSingleLineComment(pending: LexerState): LexerState {
    // we can't use ifHasNext() here because comments can be long and we need tail recursion
    if (pending.empty) return pending;
    if (pending.stream.first() === '\n') return pending.consume();
    return consumeSingleLineComment(pending.consume());
}

enum MutliLineCommentState {
    START,     // only the first '/' consumed
    BODY,      // '/*' consumed
    MAYBE_END, // a '*' is consumed in the body
}

/**
 * A multi line comment is an ignored area of code delimited by a '/*' sequence at the start
 * and a '*\/' (no backslash) sequence at the end.
 */
function consumeMultiLineComment(pending: LexerState, state = MutliLineCommentState.START): LexerState {
    // we can't use ifHasNext() here because a) we need tail recursion b) we have a state parameter
    if (pending.empty) throw new BoxError(Diagnostic('Unterminated comment', pending.stream.position));
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

/**
 * An identifier is a sequence of alphanumeric characters and '_' (but can't start with a number)
 * that serves as the name of a code element such as a variable or type.
 * Some valid identifier sequences are reserved words in the language, and these
 * are parsed as RESERVED tokens instead of IDENT tokens.
 */
function consumeIdentifierOrReserved(pending: LexerState): LexerState {
    return pending.ifHasNext(1, ([c]) => ['upper', 'lower', 'num', '_'].includes(kind(c)), consumeIdentifierOrReserved)
        .else(state => RESERVED.includes(state.image) ? state.setType(TokenType.RESERVED) : state.setType(TokenType.IDENT));
}

/**
 * Consume either: hex, binary, float, decimal
 */
function consumeNumber(pending: LexerState): LexerState {
    if (pending.image === '0') {
        return pending
            .ifHasNext(2, ([c1, c2]) => c1.toLowerCase() === 'x' && isHex(c2),
                state => consumeHexLiteral(state.setType(TokenType.INTEGER_LITERAL)))
            .elseIf(2, ([c1, c2]) => c1.toLowerCase() === 'b' && '01'.includes(c2),
                state => consumeBinLiteral(state.setType(TokenType.INTEGER_LITERAL)))
            .elseIf(2, ([c1, c2]) => '.e'.includes(c1.toLowerCase()) && kind(c2) === 'num',
                (state, img) => consumeFloatLiteral(state.setType(TokenType.FLOAT_LITERAL),
                    img[0] === '.' ? FloatLiteralState.FRACTION : FloatLiteralState.EXPONENT))
            .else(consumeDecLiteral);
    }
    return consumeDecLiteral(pending);
}

/**
 * Hexadecimal literals: 0[xX][0-9a-fA-F]+
 */
function consumeHexLiteral(pending: LexerState): LexerState {
    return pending.ifHasNext(1, ([c]) => isHex(c), consumeHexLiteral).else(state => state.setValue(parseHex));
}

/**
 * Binary literals: 0[bB][01]+
 */
function consumeBinLiteral(pending: LexerState): LexerState {
    return pending.ifHasNext(1, ([c]) => '01'.includes(c), consumeBinLiteral).else(state => state.setValue(parseBin));
}

enum FloatLiteralState {
    FRACTION,       // segment after the decimal point
    EXPONENT,       // segment after the 'e'
}

/**
 * Float literals: whole number portion + (fractional portion and/or exponent portion)
 */
function consumeFloatLiteral(pending: LexerState, state: FloatLiteralState): LexerState {
    if (state === FloatLiteralState.FRACTION) {
        return pending
            .ifHasNext(2, ([c1, c2]) => c1.toLowerCase() === 'e' && kind(c2) === 'num',
                s => consumeFloatLiteral(s, FloatLiteralState.EXPONENT))
            .elseIf(1, ([c]) => kind(c) === 'num', 
                s => consumeFloatLiteral(s, state))
            .else(s => s.setValue(parseFloat));
    } else {
        return pending.ifHasNext(1, ([c]) => kind(c) === 'num', s => consumeFloatLiteral(s, state))
            .else(s => s.setValue(parseFloat));
    }
}

/**
 * Decimal literals: sequence of numbers
 */
function consumeDecLiteral(pending: LexerState): LexerState {
    return pending
        .ifHasNext(2, ([c1, c2]) => '.e'.includes(c1.toLowerCase()) && kind(c2) === 'num',
            (state, img) => consumeFloatLiteral(state,
                img[0] === '.' ? FloatLiteralState.FRACTION : FloatLiteralState.EXPONENT))
        .elseIf(1, ([c]) => kind(c) === 'num', consumeDecLiteral)
        .else(state => state.setValue(parseInt));
}

const ESCAPE: { readonly [key: string]: string } = { n: '\n', r: '\r', t: '\t', f: '\f', b: '\b', v: '\v' };

/**
 * Literals of character sequences
 */
function consumeStringLiteral(pending: LexerState): LexerState {
    if (pending.empty) throw new BoxError(Diagnostic('Unterminated string', pending.stream.position));
    const next = pending
        // end of string
        .ifHasNext(1, ([c]) => c === '"', state => state)
        // basic escape codes
        .elseIf(2, ([c1, c2]) => c1 === '\\' && 'nrtfbv'.includes(c2),
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

/**
 * Literals of single characters
 */
function consumeCharLiteral(pending: LexerState): LexerState {
    if (pending.empty) throw new BoxError(Diagnostic('Unterminated character', pending.stream.position));
    const next = pending
        .ifHasNext(1, ([c]) => c === "'",
            () => { throw new BoxError(Diagnostic('Empty character', pending.stream.position)) })
        // basic escape codes
        .elseIf(2, ([c1, c2]) => c1 === '\\' && 'nrtfbv'.includes(c2),
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
        .else(() => { throw new BoxError(Diagnostic('Unterminated character', next.stream.position)) });
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
    return pending.ifHasNext(1, ([c]) => ' \t'.includes(c), consumeWhitespace)
        .else(state => state);
}

// #endregion

// #region Helpers

function kind(char: string) {
    if (char >= 'a' && char <= 'z') return 'lower';
    else if (char >= 'A' && char <= 'Z') return 'upper';
    else if (char >= '0' && char <= '9') return 'num';
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
    return parseInt(image.replace(/0b/i, ''), 2);
}

// #endregion
