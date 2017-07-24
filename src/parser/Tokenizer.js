import LookaheadIterator from './LookaheadIterator';
import ParserError from './ParserError';


/**
 * Represents a single token extracted from the source string.
 * 'type' specifies what kind of terminal the token represents, and is used by the parser.
 * 'offset' is the position in the source file of the first character of the token.
 * 'image' is an exact copy of the token from the original source string.
 * 'value' is an optional value that represents the parsed value of the token, if it makes sense for the token type (numbers, strings, etc.).
 */
export class Token {
    constructor(type, line, column, image, value = null) {
        this.type = type;
        this.line = line;
        this.column = column;
        this.image = image;
        this.value = value;
    }
}

/**
 * Class responsible for lexical analysis of a source string: splitting the source string into tokens.
 * This class implements the Iterable interface, so it must be iterated, which yields each token in the source string.
 */
export default class Tokenizer {
    // set of characters allowed for semantic operators (note that equals by itself or followed by a greater-than are both reserved)
    static OPER_CHARS = ['~', '!', '$', '%', '^', '&', '*', '+', '-', '=', '|', '<', '>', '?', '/'];

    // reserved language keywords, any identifier that matches one of these is registered as a keyword instead
    static KEYWORD_TOKENS = [
        'as',      // used for renaming imports
        'bool',    // boolean type name
        'break',   // statement to break from a loop
        'byte',    // byte type name (alias of u8)
        'catch',   // denotes a catch block in a try-catch block
        'char',    // character type name
        'default', // used to declare a default export, also for a default case in a pattern match block
        'do',      // denotes the start of a do-while loop
        'double',  // double type name (alias for f64)
        'else',    // denotes the start of an else clause
        'export',  // declares a module export
        'f32',     // 32-bit floating point type (equivalent to 'float')
        'f64',     // 64-bit floating point type (equivalent to 'double')
        'finally', // denotes a finally block in a try-catch-finally block
        'float',   // float type name (alias for f32)
        'for',     // denotes the start of a classic for loop
        'foreach', // denotes the start of an iterator loop
        'from',    // used in import and export declarations to specify the name of another module
        'func',    // denotes a named function declaration
        'i16',     // 16 bit signed integer type
        'i32',     // 32 bit signed integer type (equivalent to 'int')
        'i64',     // 64 bit signed integer type (equivalent to 'long')
        'i8',      // 8 bit signed integer type
        'if',      // denotes the start of an if block
        'import',  // declares a module import
        'int',     // int type name (alias for i32)
        'integer', // integer type name (true integer, infinite capacity)
        'long',    // long type name (alias for i64)
        'return',  // denotes a return statement to return a value from a function
        'short',   // short type name (alias for u16)
        'string',  // string type name
        'throw',   // denotes a throw statement to throw an exception from a function
        'try',     // denotes the start of a try-catch block
        'type',    // denotes the start of a type declaration
        'u16',     // 16 bit unsigned integer type (equivalent to 'short')
        'u32',     // 32 bit unsigned integer type
        'u64',     // 64 bit unsigned integer type
        'u8',      // 8 bit unsigned integer type (equivalent to 'byte')
        'void',    // return type of functions, indicates no value is returned (alias for '()')
        'while',   // denotes the start of a while loop
    ];

    // reserved syntactic symbols, no operator can contain these (except =)
    static SYMBOL_MAP = {
        ':': 'COLON',      // used in a default import (as in 'import from "module": identifier'), also to separate keys from values in an object literal
        '{': 'LBRACE',     // used with RBRACE to delimit a block, used in several places, most notably function bodies
        '}': 'RBRACE',
        '(': 'LPAREN',     // used with RPAREN to delimit an explicitly bounded expression or type expression, also used as delimiter in several other places
        ')': 'RPAREN',
        '[': 'LBRACK',     // used with RBRACK to delimit an array literal, also in array index expressions
        ']': 'RBRACK',
        ',': 'COMMA',      // used as a delimiter in several places: function params, arrays, object literals, imports, exports, etc.
        '=': 'EQUALS',     // used to bind a value to an identifier, also used in a few other places
        '=>': 'FAT_ARROW', // used to separate a function's parameter list from its body
        '`': 'BACKTICK',   // used to allow certain functions to be used akin to an operator, either prefix, postfix, or infix
        '.': 'DOT',        // used in field access expressions
    };

    /**
     * - source: a reference to the original source string
     * - iterator: the lookahead iterator providing characters from the source string
     * - gen: generator that yields tokens, logic contained in _generator()
     * - lineNumber: the current line number
     * - currentLineOffset: the offset in the source string off the current line, used to determine column numbers of tokens and errors
     * - ignoreMode: if true, all comments, whitespace, and semicolons are ignored from the yielded token output; if false, all tokens are yielded
     */
    constructor(string) {
        this.source = string;
        this.iterator = new LookaheadIterator(string);
        this.gen = this._generator();
        this.lineNumber = 1;
        this.currentLineOffset = 0;
        this.ignoreMode = true;
    }

    /**
     * Computes the 1-based column number of the *previously consumed* character.
     * Ex: in the source code string "\nabcde", these are the columns:
     * Character | Offset | Line # | Column #
     * --------------------------------------
     * SOF       | 0      | 1      | 0        (SOF is not a character, it just represents the initial state, a.k.a. no characters yet consumed)
     * \n        | 1      | 1      | 1        (once \n is consumed, the iterator offset is 1, the character itself is still on line 1, column 1)
     * a         | 2      | 2      | 1        (we are now on a new line, 1st character of the line)
     * b         | 3      | 2      | 2
     * c         | 4      | 2      | 3
     * d         | 5      | 2      | 4
     * e         | 6      | 2      | 5
     * EOF       | 7      | 2      | 6
     * We can compute the column of a character by subtracting the offset of the start of the line from the iterator offset.
     * = this.iterator.offset - this.currentLineOffset
     * We can compute the column of the start of the token by subtracting the length of the token from the column of the last character and adding 1.
     * = this.iterator.offset - this.currentLineOffset - token.length + 1
     *
     * For example: using the token 'abcde' above:
     * - this.iterator.offset = 6
     * - this.currentLineOffset = 1
     * - token.length = 5
     * - token.column = 6 - 1 - 5 + 1 = 1
     */
    get columnNumber() {
        return this.iterator.offset - this.currentLineOffset;
    }

    /**
     * Given a token length (should be equal to the distance between the start of the token and the current offset, whatever that may be),
     * compute the column number of that token.
     */
    getColumnNumber(tokenLength) {
        return (this.columnNumber - tokenLength) + 1;
    }

    [Symbol.iterator]() {
        return this;
    }

    next() {
        return this.gen.next();
    }

    /**
     * Fully iterate the entire source string, extracting tokens according to the language's grammar rules and yielding each one.
     */
    *_generator() {
        // iterate the lookahead iterator
        for (const c of this.iterator) {
            // "kind" is either "uppercase", "lowercase", "number", or the character
            const kind = this.kind(c);
            const c1 = this.iterator.peek();

            // This logic follows a specific order for attempting to extract tokens:
            // 1. Identifiers (also checks keywords that match an identifier string)
            // 2. Negative numbers (via minus, fall back to operator if there is no number)
            // 3. Numbers (includes 0, hex, binary, float, and decimal integers)
            // 4. String literals
            // 5. Char literals
            // 6. Special syntactic symbols (reserved symbols that have syntactic meaning, ignoring =)
            // 7. Symbols starting with = (just '=' and '=>', fall back to operator if neither matches)
            // 8. Operators (tokens made from a specific list of allowed operator characters)
            // 9. New lines (\n and ;, semi is for separating a line in two without an actual new line)
            // 10. CRLF new lines (\r is treated as normal whitespace if not followed by a \n)
            // 11. Whitespace (space and tab)
            // 12. Everything else (throws an error for now)

            // check to see if the character is a valid identifier start
            if (kind === 'uppercase' || kind === 'lowercase' || c === '_') {
                // consume an identifier
                yield this.consumeIdentifier(c);
            } else if (c === '-') {
                // if it is followed by a number, consume it as a number
                if (this.kind(c1) === 'number') yield this.consumeNumber(c);
                // otherwise, consume it as an operator
                else yield this.consumeOperator(c);
            } else if (kind === 'number') {
                // consume the number
                yield this.consumeNumber(c);
            } else if (c === '"') {
                // consume a string literal
                yield this.consumeStringLiteral(c);
            } else if (c === "'") {
                // consume a character literal
                yield this.consumeCharacterLiteral(c);
            } else if (Tokenizer.SYMBOL_MAP[c] && c !== '=') {
                // consume a symbol
                yield new Token(Tokenizer.SYMBOL_MAP[c], this.lineNumber, this.columnNumber, c);
            } else if (c === '=') {
                // consume an equals, a fat arrow, or an operator starting with equals
                if (c1 === '>') {
                    // fat arrow (NOTE: this will ignore any other operator characters that come immediately after, fat arrow takes precedence)
                    this.iterator.next();
                    yield new Token(Tokenizer.SYMBOL_MAP['=>'], this.lineNumber, this.columnNumber - 1, '=>');
                } else if (Tokenizer.OPER_CHARS.includes(c1)) {
                    // other non-greater-than operator character, consume as operator
                    yield this.consumeOperator(c);
                } else {
                    // otherwise it's a lone equals symbol
                    yield new Token(Tokenizer.SYMBOL_MAP[c], this.lineNumber, this.columnNumber, c);
                }
            } else if (Tokenizer.OPER_CHARS.includes(c)) {
                // consume as operator
                yield this.consumeOperator(c);
            } else if (c === '\n' || c === ';') {
                // new line character
                if (!this.ignoreMode) yield new Token('NEWLINE', this.lineNumber, this.columnNumber, c);
                if (c === '\n') {
                    // increment line number
                    this.lineNumber++;
                    this.currentLineOffset = this.iterator.offset;
                }
            } else if (c === '\r') {
                if (c1 === '\n') {
                    // treat the whole thing as a new line
                    this.iterator.next();
                    if (!this.ignoreMode) yield new Token('NEWLINE', this.lineNumber, this.getColumnNumber(2), '\r\n');
                    // increment line number
                    this.lineNumber++;
                    this.currentLineOffset = this.iterator.offset;
                } else {
                    // otherwise treat it as normal whitespace
                    if (!this.ignoreMode) yield this.consumeWhitespace(c);
                }
            } else if (c === ' ' || c === '\t') {
                // consume whitespace
                if (!this.ignoreMode) yield this.consumeWhitespace(c);
            } else {
                // otherwise it is not a valid character (for now)
                throw new ParserError(`Invalid character '${c}'`, this.lineNumber, this.columnNumber);
            }
        }
        // yield a EOF token
        yield new Token('EOF', this.lineNumber, this.getColumnNumber(0), null);
    }

    /**
     * Consume whitespace until we reach a new line token, then return that token.
     * If we reach a non-whitespace token before seeing a new line, throw an error.
     */
    getNewLine() {
        this.ignoreMode = false;
        for (const tok of this) {
            if (tok.type === 'NEWLINE') {
                this.ignoreMode = true;
                return tok;
            } else if (tok.type !== 'WHITESPACE') {
                this.ignoreModel = true;
                throw new ParserError(`Expected new line or semicolon, got ${tok.image}`, tok.startLine, tok.startColumn);
            }
        }
    }

    /**
     * Determine if a character is a lowercase character, an uppercase character, or a number.
     * Return the character as-is for anything else.
     */
    kind(char) {
        if (char >= 'a' && char <= 'z') return 'lowercase';
        else if (char >= 'A' && char <= 'Z') return 'uppercase';
        else if (char >= '0' && char <= '9') return 'number';
        else return char;
    }

    /**
     * image is alphanumeric (or underscore), consume an identifier.
     * This may match a keyword, in which case that will be returned instead.
     */
    consumeIdentifier(image) {
        const next = this.iterator.peek();
        const kind = this.kind(next);
        // if the next character is a valid identifier character, loop to get all the remaining ones
        if (kind === 'uppercase' || kind === 'lowercase' || kind === 'number' || next === '_') {
            while (true) {
                image += this.iterator.next().value;
                const kind1 = this.kind(this.iterator.peek());
                // if the next character will not be a valid identifier character, then break
                if (kind1 !== 'uppercase' && kind1 !== 'lowercase' && kind1 !== 'number' && kind1 !== '_') break;
            }
        }
        // if the identifier we captured matches a keyword, return the keyword
        if (Tokenizer.KEYWORD_TOKENS.includes(image)) return new Token(image.toUpperCase(), this.lineNumber, this.getColumnNumber(image.length), image);
        // otherwise, return an identifier
        else return new Token('IDENT', this.lineNumber, this.getColumnNumber(image.length), image);
    }

    /**
     * All that we know is that the image represents the start of a number.
     * Figure out what kind and return a token.
     */
    consumeNumber(image) {
        if (image === '-') {
            // number starts with minus, save that information and shift forward
            image += this.iterator.next().value;
            // it may be that next was the last character in the source. handle that here.
            if (!this.iterator.peek()) return new Token('INTEGER_LITERAL', this.lineNumber, this.getColumnNumber(image.length), image, parseInt(image, 10));
        }
        const [c, c1] = this.iterator.peek(0, 2);
        if (image.endsWith('0') && c && c1) {
            // literals that start with 0 are a special case, check for alternative bases.
            if (c.toLowerCase() === 'x') {
                // in order for this to be a valid hex literal, the '0x' must be followed by at least 1 hex digit
                if (this.isHexidecimalDigit(c1)) {
                    // consume hexadecimals, return hex literal token
                    return this.consumeHexLiteral(image);
                }
            } else if (c.toLowerCase() === 'b') {
                // in order for this to be a valid binary literal, the '0b' must be followed by at least 1 binary digit
                if (c1 === '0' || c1 === '1') {
                    // consume binary digits, return binary literal token
                    return this.consumeBinaryLiteral(image);
                }
            } else if (c === '.' || c.toLowerCase() === 'e') {
                // in order for this to be valid, it must be followed by a number
                if (this.kind(c1) === 'number') {
                    return this.consumeFloatLiteral(image);
                }
            }
        }
        // if this is a 0 that is not followed by a 'x', 'b', '.', or 'e', or it is not a 0 at all, consume it as a normal decimal integer
        return this.consumeIntegerLiteral(image);
    }

    /**
     * Given a starting image (containing '0') and a lookahead character (verified to be 'x')
     * and it is known that the next lookahead character is a hex digit, consume an entire hex literal.
     */
    consumeHexLiteral(image) {
        // it has already been verified that next is 'x' and the following character is a hex digit, skip ahead to the hex digits.
        image += this.iterator.next().value;
        // take the first digit
        image += this.iterator.next().value;
        // while the next character is a hex digit, add it to the image
        while (this.isHexidecimalDigit(this.iterator.peek())) image += this.iterator.next().value;
        return new Token('INTEGER_LITERAL', this.lineNumber, this.getColumnNumber(image.length), image, parseInt(image, 16));
    }

    /**
     * Given a starting image (containing '0') and a lookahead character (verified to be 'b')
     * and it is known that the next lookahead character is a binary digit, consume an entire binary literal.
     */
    consumeBinaryLiteral(image) {
        // it has already been verified that next is 'b' and the following character is binary, skip ahead to the digits.
        image += this.iterator.next().value;
        // take the first digit
        image += this.iterator.next().value;
        // while the next character is a binary digit, add it to the image
        while (this.isBinaryDigit(this.iterator.peek())) image += this.iterator.next().value;
        // JS doesn't have binary literals, so we need to remove the prefix when parsing
        return new Token('INTEGER_LITERAL', this.lineNumber, this.getColumnNumber(image.length), image, parseInt(image.replace(/0b/i, ''), 2));
    }

    isBinaryDigit = c => c === '0' || c === '1';

    /**
     * Given a starting image (containing some sequence of numbers) and a lookahead character (must be either '.' or 'e')
     * and it is know that the next lookahead character is a number, consume an entire floating point literal.
     */
    consumeFloatLiteral(image) {
        const next = this.iterator.peek();
        // next is either a dot or 'e', accept it, skip ahead two characters, next must be a number, accept it right away
        image += this.iterator.next().value;
        image += this.iterator.next().value;

        if (next === '.') {
            // handle fractional portion, consume all numbers following
            while (this.kind(this.iterator.peek()) === 'number') image += this.iterator.next().value;
            // next character is e, handle exponent portion
            const [c1, c2] = this.iterator.peek(0, 2);
            if (c1 && c1.toLowerCase() === 'e') {
                // but only do it if there is a number after e
                if (this.kind(c2) === 'number') {
                    // recurse, this will only happen once because the next character is an e
                    return this.consumeFloatLiteral(image, c1);
                }
            }
        } else {
            // must be e, handle exponent portion
            while (this.kind(this.iterator.peek()) === 'number') image += this.iterator.next().value;
        }
        // we arrive here when we've consumed as much floating point characters as we can
        return new Token('FLOAT_LITERAL', this.lineNumber, this.getColumnNumber(image.length), image, parseFloat(image));
    }

    /**
     * Given a starting image (some sequence of numbers) and a lookahead character (can possibly be any character),
     * consume an entire integer literal (may encounter a floating point literal)
     */
    consumeIntegerLiteral(image) {
        let next = this.iterator.peek();
        // if next is number, we want to consume more numbers if there are any
        if (this.kind(next) === 'number') {
            image += this.iterator.next().value;
            // consume all subsequenct numbers
            while (this.kind(this.iterator.peek()) === 'number') {
                image += this.iterator.next().value;
            }
            // if the next is now a dot or e that is followed by a number, we have a float, defer to that logic
            next = this.iterator.peek();
            if (next === '.' || next === 'e') {
                if (this.kind(this.iterator.peek(1)) === 'number') {
                    return this.consumeFloatLiteral(image);
                }
            }
        } else if (next === '.' || next === 'e') {
            // if the current next is a dot or e followed by a number, parse as float
            if (this.kind(this.iterator.peek(1)) === 'number') {
                return this.consumeFloatLiteral(image);
            }
        }
        // otherwise take the numbers we have enumerated so far and parse them as an int
        return new Token('INTEGER_LITERAL', this.lineNumber, this.getColumnNumber(image.length), image, parseInt(image, 10));
    }

    /**
     * Given a starting image (") and an initial next character, consume an entire string literal
     */
    consumeStringLiteral(image) {
        // if there is no next character, throw an error
        if (!this.iterator.peek()) throw new ParserError('Unterminated string', this.lineNumber, this.columnNumber);

        let value = '';
        if (this.iterator.peek() !== '"') {
            do {
                const c = this.iterator.next().value;
                image += c;
                if (c === '\\') {
                    const next = this.iterator.peek();
                    if (next !== 'x' && next !== 'u') {
                        switch (next) {
                            case 'n': value += '\n'; break; // new line
                            case 'r': value += '\r'; break; // carriage return
                            case 't': value += '\t'; break; // tab
                            case 'f': value += '\f'; break;
                            case 'b': value += '\b'; break; // backspace
                            case 'v': value += '\v'; break; // vertical tab
                            default: value += next; break;
                        }
                        // skip ahead for a basic escape sequence because there are only two characters
                        image += this.iterator.next().value;
                    } else if (next === 'x') {
                        // ascii escape code
                        const [c1, c2, c3] = this.iterator.peek(0, 3);
                        if (this.isHexidecimalDigit(c2) && this.isHexidecimalDigit(c3)) {
                            image += (c1 + c2 + c3);
                            value += String.fromCodePoint(parseInt(c2 + c3, 16));
                            for (let i = 0; i < 3; ++i) this.iterator.next();
                        } else {
                            // invalid escape code, treat it like \x
                            value += c1;
                            image += c1;
                            this.iterator.next();
                        }
                    } else {
                        // unicode escape code
                        const [c1, c2, c3, c4, c5, c6, c7, c8, c9] = this.iterator.peek(0, 9);
                        if ([c2, c3, c4, c5].every(ch => this.isHexidecimalDigit(ch))) {
                            image += (c1 + c2 + c3 + c4 + c5);
                            value += String.fromCodePoint(parseInt(c2 + c3 + c4 + c5, 16));
                            for (let i = 0; i < 5; ++i) this.iterator.next();
                        } else if (c2 === '{' && [c3, c4, c5, c6, c7].every(ch => this.isHexidecimalDigit(ch)) && c8 === '}') {
                            image += [c1, c2, c3, c4, c5, c6, c7, c8].join('');
                            value += String.fromCodePoint(parseInt(c3 + c4 + c5 + c6 + c7, 16));
                            for (let i = 0; i < 8; ++i) this.iterator.next();
                        } else if (c2 === '{' && [c3, c4, c5, c6, c7, c8].every(ch => this.isHexidecimalDigit(ch)) && c9 === '}') {
                            image += [c1, c2, c3, c4, c5, c6, c7, c8, c9].join('');
                            value += String.fromCodePoint(parseInt(c3 + c4 + c5 + c6 + c7 + c8, 16));
                            for (let i = 0; i < 9; ++i) this.iterator.next();
                        } else {
                            // invalid, treat it like \u
                            value += c1;
                            image += c1;
                            this.iterator.next();
                        }
                    }
                } else {
                    // just a normal everyday character
                    value += c;
                }
            } while (this.iterator.peek() && (this.iterator.peek() !== '"' || image.endsWith('\\')));
            // no next character, throw an error
            if (!this.iterator.peek()) throw new ParserError('Unterminated string', this.lineNumber, this.columnNumber);
        }
        // next character is double quote
        this.iterator.next();
        image += '"';
        return new Token('STRING_LITERAL', this.lineNumber, this.getColumnNumber(image.length), image, value);
    }

    /**
     * Given a starting image (') and an initial next character, consume an entire character literal
     */
    consumeCharacterLiteral(image) {
        // if there is no next character, throw an error
        if (!this.iterator.peek()) throw new ParserError('Unterminated character', this.lineNumber, this.columnNumber);
        if (this.iterator.peek() === "'") throw new ParserError('Empty character', this.lineNumber, this.columnNumber + 1);

        let value;
        const c = this.iterator.next().value;
        image += c;
        if (c === '\\') {
            // escape sequence
            const next = this.iterator.peek();
            if (next !== 'x' && next !== 'u') {
                switch (next) {
                    case 'n': value = '\n'; break; // new line
                    case 'r': value = '\r'; break; // carriage return
                    case 't': value = '\t'; break; // tab
                    case 'f': value = '\f'; break;
                    case 'b': value = '\b'; break; // backspace
                    case 'v': value = '\v'; break; // vertical tab
                    default: value = next; break;
                }
                // skip ahead for a basic escape sequence because there are only two characters
                image += this.iterator.next().value;
            } else if (next === 'x') {
                // ascii escape code
                const [c1, c2, c3] = this.iterator.peek(0, 3);
                if (this.isHexidecimalDigit(c2) && this.isHexidecimalDigit(c3)) {
                    image += (c1 + c2 + c3);
                    value = String.fromCodePoint(parseInt(c2 + c3, 16));
                    for (let i = 0; i < 3; ++i) this.iterator.next();
                } else {
                    // invalid escape code, treat it like \x
                    value = c1;
                    image += c1;
                    this.iterator.next();
                }
            } else {
                // unicode escape code
                const [c1, c2, c3, c4, c5, c6, c7, c8, c9] = this.iterator.peek(0, 9);
                if ([c2, c3, c4, c5].every(ch => this.isHexidecimalDigit(ch))) {
                    image += (c1 + c2 + c3 + c4 + c5);
                    value = String.fromCodePoint(parseInt(c2 + c3 + c4 + c5, 16));
                    for (let i = 0; i < 5; ++i) this.iterator.next();
                } else if (c2 === '{' && [c3, c4, c5, c6, c7].every(ch => this.isHexidecimalDigit(ch)) && c8 === '}') {
                    image += [c1, c2, c3, c4, c5, c6, c7, c8].join('');
                    value = String.fromCodePoint(parseInt(c3 + c4 + c5 + c6 + c7, 16));
                    for (let i = 0; i < 8; ++i) this.iterator.next();
                } else if (c2 === '{' && [c3, c4, c5, c6, c7, c8].every(ch => this.isHexidecimalDigit(ch)) && c9 === '}') {
                    image += [c1, c2, c3, c4, c5, c6, c7, c8, c9].join('');
                    value = String.fromCodePoint(parseInt(c3 + c4 + c5 + c6 + c7 + c8, 16));
                    for (let i = 0; i < 9; ++i) this.iterator.next();
                } else {
                    // invalid, treat it like \u
                    value = c1;
                    image += c1;
                    this.iterator.next();
                }
            }
        } else {
            // just a normal everyday character
            value = c;
        }
        // no next character, throw an error
        if (!this.iterator.peek()) throw new ParserError('Unterminated character', this.lineNumber, this.columnNumber);
        // next character is single quote
        this.iterator.next();
        image += "'";
        return new Token('CHARACTER_LITERAL', this.lineNumber, this.getColumnNumber(image.length), image, value);
    }

    /**
     * Consume a sequence of valid operator characters
     */
    consumeOperator(image) {
        while (Tokenizer.OPER_CHARS.includes(this.iterator.peek())) image += this.iterator.next().value;
        return new Token('OPER', this.lineNumber, this.getColumnNumber(image.length), image);
    }

    /**
     * Consume any amount of spaces and tabs
     */
    consumeWhitespace(image) {
        while (this.isWhitespace(this.iterator.peek())) image += this.iterator.next().value;
        return new Token('WHITESPACE', this.lineNumber, this.getColumnNumber(image.length), image);
    }

    isWhitespace = c => c === ' ' || c === '\t';

    /**
     * Returns true if c is a hexadecimal character
     */
    isHexidecimalDigit(c) {
        if (!c) return false;
        const low = c.toLowerCase();
        return (c >= '0' && c <= '9') || (low >= 'a' && low <= 'f');
    }
}
