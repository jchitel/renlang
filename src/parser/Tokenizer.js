import LookaheadIterator from './LookaheadIterator';


/**
 * Represents a single token extracted from the source string.
 * 'type' specifies what kind of terminal the token represents, and is used by the parser.
 * 'offset' is the position in the source file of the first character of the token.
 * 'image' is an exact copy of the token from the original source string.
 * 'value' is an optional value that represents the parsed value of the token, if it makes sense for the token type (numbers, strings, etc.).
 */
export class Token {
    constructor(type, offset, image = type, value = null) {
        this.type = type;
        this.offset = offset;
        this.image = image;
        this.value = value;
    }
}

/**
 * Class responsible for lexical analysis of a source string: splitting the source string into tokens.
 * This class implements the Iterable interface, so it must be iterated, which yields each token in the source string.
 */
export default class Tokenizer {
    static EOF = Symbol('EOF');

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

    constructor(string) {
        this.source = string;
        this.iterator = new LookaheadIterator(string, 9); // max lookahead so far: unicode escape codes in strings/characters: '\u{......}'
    }

    /**
     * Fully iterate the entire source string, extracting tokens according to the language's grammar rules and yielding each one.
     */
    *[Symbol.iterator]() {
        // these allow us to output useful line/column information (column is this.iterator.offset - currentLineOffset)
        let lineNumber = 1;
        let currentLineOffset = 0;

        // iterate the lookahead iterator
        for (const [c, c1, c2] of this.iterator) {
            // "kind" is either "uppercase", "lowercase", "number", or the character
            const kind = this.kind(c);
            const kind1 = this.kind(c1);

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
                yield this.consumeIdentifier(c, c1);
            } else if (c === '-') {
                // if it is followed by a number, consume it as a number
                if (kind1 === 'number') yield this.consumeNumber(c, c1, c2);
                // otherwise, consume it as an operator
                else yield this.consumeOperator(c, c1);
            } else if (kind === 'number') {
                // consume the number
                yield this.consumeNumber(c, c1, c2);
            } else if (c === '"') {
                // consume a string literal
                try {
                    yield this.consumeStringLiteral(c);
                } catch (err) {
                    // the string was unterminated
                    throw new Error(`${err.message} at line ${lineNumber}, column ${this.iterator.offset - 1 - currentLineOffset}.`);
                }
            } else if (c === "'") {
                // consume a character literal
                try {
                    yield this.consumeCharacterLiteral(c);
                } catch (err) {
                    // the character was unterminated or empty
                    throw new Error(`${err.message} at line ${lineNumber}, column ${this.iterator.offset - 1 - currentLineOffset}.`);
                }
            } else if (Tokenizer.SYMBOL_MAP[c] && c !== '=') {
                // consume a symbol
                yield new Token(Tokenizer.SYMBOL_MAP[c], this.iterator.offset - 1, c);
            } else if (c === '=') {
                // consume an equals, a fat arrow, or an operator starting with equals
                if (c1 === '>') {
                    // fat arrow (NOTE: this will ignore any other operator characters that come immediately after, fat arrow takes precedence)
                    this.iterator.next();
                    yield new Token(Tokenizer.SYMBOL_MAP['=>'], this.iterator.offset - 2, '=>');
                } else if (Tokenizer.OPER_CHARS.includes(c1)) {
                    // other non-greater-than operator character, consume as operator
                    yield this.consumeOperator(c, c1);
                } else {
                    // otherwise it's a lone equals symbol
                    yield new Token(Tokenizer.SYMBOL_MAP[c], this.iterator.offset - 1, c);
                }
            } else if (Tokenizer.OPER_CHARS.includes(c)) {
                // consume as operator
                yield this.consumeOperator(c, c1);
            } else if (c === '\n' || c === ';') {
                // new line character
                yield new Token('NEWLINE', this.iterator.offset - 1, c);
                if (c === '\n') {
                    // increment line number
                    lineNumber++;
                    currentLineOffset = this.iterator.offset;
                }
            } else if (c === '\r') {
                if (c1 === '\n') {
                    // treat the whole thing as a new line
                    this.iterator.next();
                    yield new Token('NEWLINE', this.iterator.offset - 2, '\r\n');
                    // increment line number
                    lineNumber++;
                    currentLineOffset = this.iterator.offset;
                } else {
                    // otherwise treat it as normal whitespace
                    yield this.consumeWhitespace(c, c1);
                }
            } else if (c === ' ' || c === '\t') {
                // consume whitespace
                yield this.consumeWhitespace(c, c1);
            } else {
                // otherwise it is not a valid character (for now)
                throw new Error(`Invalid character '${c}' at line ${lineNumber}, column ${this.iterator.offset - 1 - currentLineOffset}.`);
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
    consumeIdentifier(image, next) {
        const kind = this.kind(next);
        // if the next character is a valid identifier character, loop to get all the remaining ones
        if (kind === 'uppercase' || kind === 'lowercase' || kind === 'number' || next === '_') while (true) {
            const { value: [c, c1], done } = this.iterator.next();
            // if the iterator is done, break out of the loop, this will be the last iteration
            if (done) break;
            image += c;
            const kind1 = this.kind(c1);
            // if the next character will not be a valid identifier character, then break
            if (kind1 !== 'uppercase' && kind1 !== 'lowercase' && kind1 !== 'number' && kind1 !== '_') break;
        }
        // if the identifier we captured matches a keyword, return the keyword
        if (Tokenizer.KEYWORD_TOKENS.includes(image)) return new Token(image.toUpperCase(), this.iterator.offset - image.length, image);
        // otherwise, return an identifier
        else return new Token('IDENT', this.iterator.offset - image.length, image);
    }

    /**
     * All that we know is that the image represents the start of a number.
     * Figure out what kind and return a token.
     */
    consumeNumber(image, next, next1) {
        let negative = false;
        if (image === '-') {
            // number starts with minus, save that information and shift forward
            negative = true;
            image += next;
            [next, next1] = this.iterator.next().value.shift();
            // it may be that next was the last character in the source. handle that here.
            if (!next) return new Token('INTEGER_LITERAL', this.iterator.offset - 2, image, parseInt(image, 10));
        }
        if (image.endsWith('0')) {
            // literals that start with 0 are a special case, check for alternative bases.
            if (next.toLowerCase() === 'x') {
                // in order for this to be a valid hex literal, the '0x' must be followed by at least 1 hex digit
                if (this.isHexidecimalDigit(next1)) {
                    // consume hexadecimals, return hex literal token
                    return this.consumeHexLiteral(image, next);
                }
            } else if (next.toLowerCase() === 'b') {
                // in order for this to be a valid binary literal, the '0b' must be followed by at least 1 binary digit
                if (next1 === '0' || next1 === '1') {
                    // consume binary digits, return binary literal token
                    return this.consumeBinaryLiteral(image, next);
                }
            } else if (next === '.' || next.toLowerCase() === 'e') {
                // in order for this to be valid, it must be followed by a number
                if (this.kind(next1) === 'number') {
                    return this.consumeFloatLiteral(image, next);
                }
            }
        }
        // if this is a 0 that is not followed by a 'x', 'b', '.', or 'e', or it is not a 0 at all, consume it as a normal decimal integer
        return this.consumeIntegerLiteral(image, next, next1);
    }

    /**
     * Given a starting image (containing '0') and a lookahead character (verified to be 'x')
     * and it is known that the next lookahead character is a hex digit, consume an entire hex literal.
     */
    consumeHexLiteral(image, next) {
        // it has already been verified that next is 'x' and the following character is a hex digit, skip ahead to the hex digits.
        image += next;
        this.iterator.next();
        let [c, c1] = this.iterator.next().value;
        // take the first digit
        image += c;
        // while the next character is a hex digit, add it to the image
        while (this.isHexidecimalDigit(c1)) {
            [c, c1] = this.iterator.next().value;
            image += c;
        }
        return new Token('INTEGER_LITERAL', this.iterator.offset - image.length, image, parseInt(image, 16));
    }

    /**
     * Given a starting image (containing '0') and a lookahead character (verified to be 'b')
     * and it is known that the next lookahead character is a binary digit, consume an entire binary literal.
     */
    consumeBinaryLiteral(image, next) {
        // it has already been verified that next is 'b' and the following character is binary, skip ahead to the digits.
        image += next;
        this.iterator.next();
        let [c, c1] = this.iterator.next().value;
        // take the first digit
        image += c;
        // while the next character is a binary digit, add it to the image
        while (c1 === '0' || c1 === '1') {
            [c, c1] = this.iterator.next().value;
            image += c;
        }
        // JS doesn't have binary literals, so we need to remove the prefix when parsing
        return new Token('INTEGER_LITERAL', this.iterator.offset - image.length, image, parseInt(image.replace(/0b/i, ''), 2));
    }

    /**
     * Given a starting image (containing some sequence of numbers) and a lookahead character (must be either '.' or 'e')
     * and it is know that the next lookahead character is a number, consume an entire floating point literal.
     */
    consumeFloatLiteral(image, next) {
        // next is either a dot or 'e', accept it, skip ahead two characters, next must be a number, accept it right away
        image += next;
        this.iterator.next();
        let [c, c1, c2] = this.iterator.next().value;
        image += c;

        if (next === '.') {
            // handle fractional portion, consume all numbers following
            while (this.kind(c1) === 'number') {
                [c, c1, c2] = this.iterator.next().value;
                image += c;
            }
            // next character is e, handle exponent portion
            if (c1.toLowerCase() === 'e') {
                // but only do it if there is a number after e
                if (this.kind(c2) === 'number') {
                    // recurse, this will only happen once because the next character is an e
                    return this.consumeFloatLiteral(image, c1);
                }
            }
        } else {
            // must be e, handle exponent portion
            while (this.kind(c1) === 'number') {
                [c, c1] = this.iterator.next().value;
                image += c;
            }
        }
        // we arrive here when we've consumed as much floating point characters as we can
        return new Token('FLOAT_LITERAL', this.iterator.offset - image.length, image, parseFloat(image));
    }

    /**
     * Given a starting image (some sequence of numbers) and a lookahead character (can possibly be any character),
     * consume an entire integer literal (may encounter a floating point literal)
     */
    consumeIntegerLiteral(image, next, next1) {
        // if next is number, we want to consume more numbers if there are any
        if (this.kind(next) === 'number') {
            let [c, c1, c2] = this.iterator.next().value;
            image += c;
            // consume all subsequenct numbers
            while (this.kind(c1) === 'number') {
                [c, c1, c2] = this.iterator.next().value;
                image += c;
            }
            // if the next is now a dot or e that is followed by a number, we have a float, defer to that logic
            if (c1 === '.' || c1 === 'e') {
                if (this.kind(c2) === 'number') {
                    return this.consumeFloatLiteral(image, c1);
                }
            }
        } else if (next === '.' || next === 'e') {
            // if the current next is a dot or e followed by a number, parse as float
            if (this.kind(next1) === 'number') {
                return this.consumeFloatLiteral(image, next);
            }
        }
        // otherwise take the numbers we have enumerated so far and parse them as an int
        return new Token('INTEGER_LITERAL', this.iterator.offset - image.length, image, parseInt(image, 10));
    }

    /**
     * Given a starting image (") and an initial next character, consume an entire string literal
     */
    consumeStringLiteral(image, next) {
        // if there is no next character, throw an error
        if (!next) throw new Error('Unterminated string');

        let value = '';
        if (next !== '"') {
            let c, c1;
            do {
                [c, c1, c2, c3, c4, c5, c6, c7, c8, c9] = this.iterator.next().value;
                image += c;
                if (c === '\\') {
                    if (c1 !== 'x' && c1 !== 'u') {
                        switch (c1) {
                            case 'n': value += '\n'; break; // new line
                            case 'r': value += '\r'; break; // carriage return
                            case 't': value += '\t'; break; // tab
                            case 'f': value += '\f'; break;
                            case 'b': value += '\b'; break; // backspace
                            case 'v': value += '\v'; break; // vertical tab
                            default: value += c1; break;
                        }
                        // skip ahead for a basic escape sequence because there are only two characters
                        image += c1;
                        this.iterator.next();
                    } else if (c1 === 'x') {
                        // ascii escape code
                        if (this.isHexidecimalDigit(c2) && this.isHexidecimalDigit(c3)) {
                            image += (c1 + c2 + c3);
                            for (let i = 0; i < 3; ++i) this.iterator.next();
                            value += String.fromCodePoint(parseInt(c2 + c3, 16));
                        } else {
                            // invalid escape code, treat it like \x
                            value += c1;
                            image += c1;
                            this.iterator.next();
                        }
                    } else {
                        // unicode escape code
                        if ([c2, c3, c4, c5].every(ch => this.isHexidecimalDigit(ch))) {
                            image += (c1 + c2 + c3 + c4 + c5);
                            for (let i = 0; i < 5; ++i) this.iterator.next();
                            value += String.fromCodePoint(parseInt(c2 + c3 + c4 + c5, 16));
                        } else if (c2 === '{' && [c3, c4, c5, c6, c7].every(ch => this.isHexidecimalDigit(ch)) && c8 === '}') {
                            image += [c1, c2, c3, c4, c5, c6, c7, c8].join('');
                            for (let i = 0; i < 8; ++i) this.iterator.next();
                            value += String.fromCodePoint(parseInt(c3 + c4 + c5 + c6 + c7, 16));
                        } else if (c2 === '{' && [c3, c4, c5, c6, c7, c8].every(ch => this.isHexidecimalDigit(ch)) && c9 === '}') {
                            image += [c1, c2, c3, c4, c5, c6, c7, c8, c9].join('');
                            for (let i = 0; i < 9; ++i) this.iterator.next();
                            value += String.fromCodePoint(parseInt(c3 + c4 + c5 + c6 + c7 + c8, 16));
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
            } while (c1 && (c1 !== '"' || c === '\\')); // continue until there is no next character or the next character is a non-escaped double-quote
            // no next character, throw an error
            if (!c1) throw new Error('Unterminated string');
        }
        // next character is double quote
        this.iterator.next();
        image += '"';
        return new Token('STRING_LITERAL', this.iterator.offset - image.length, image, value);
    }

    /**
     * Given a starting image (') and an initial next character, consume an entire character literal
     */
    consumeCharacterLiteral(image, next) {
        // if there is no next character, throw an error
        if (!next) throw new Error('Unterminated character');
        if (next === "'") throw new Error('Empty character literal');

        let value;
        // get the next character and lookahead buffer
        let [c, c1, c2, c3, c4, c5, c6, c7, c8, c9] = this.iterator.next().value;
        image += c;
        if (c === '\\') {
            // escape sequence
            if (c1 !== 'x' && c1 !== 'u') {
                switch (c1) {
                    case 'n': value = '\n'; break; // new line
                    case 'r': value = '\r'; break; // carriage return
                    case 't': value = '\t'; break; // tab
                    case 'f': value = '\f'; break;
                    case 'b': value = '\b'; break; // backspace
                    case 'v': value = '\v'; break; // vertical tab
                    default: value = c1; break;
                }
                // skip ahead for a basic escape sequence because there are only two characters
                image += c1;
                this.iterator.next();
            } else if (c1 === 'x') {
                // ascii escape code
                if (this.isHexidecimalDigit(c2) && this.isHexidecimalDigit(c3)) {
                    image += (c1 + c2 + c3);
                    for (let i = 0; i < 3; ++i) this.iterator.next();
                    value = String.fromCodePoint(parseInt(c2 + c3, 16));
                } else {
                    // invalid escape code, treat it like \x
                    value = c1;
                    image += c1;
                    this.iterator.next();
                }
            } else {
                // unicode escape code
                if ([c2, c3, c4, c5].every(ch => this.isHexidecimalDigit(ch))) {
                    // 16 bit code
                    image += (c1 + c2 + c3 + c4 + c5);
                    for (let i = 0; i < 5; ++i) this.iterator.next();
                    value = String.fromCodePoint(parseInt(c2 + c3 + c4 + c5, 16));
                } else if (c2 === '{' && [c3, c4, c5, c6, c7].every(ch => this.isHexidecimalDigit(ch)) && c8 === '}') {
                    // 20 bit code
                    image += [c1, c2, c3, c4, c5, c6, c7, c8].join('');
                    for (let i = 0; i < 8; ++i) this.iterator.next();
                    value = String.fromCodePoint(parseInt(c3 + c4 + c5 + c6 + c7, 16));
                } else if (c2 === '{' && [c3, c4, c5, c6, c7, c8].every(ch => this.isHexidecimalDigit(ch)) && c9 === '}') {
                    // 24 bit code
                    image += [c1, c2, c3, c4, c5, c6, c7, c8, c9].join('');
                    for (let i = 0; i < 9; ++i) this.iterator.next();
                    value = String.fromCodePoint(parseInt(c3 + c4 + c5 + c6 + c7 + c8, 16));
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
        if (!c1) throw new Error('Unterminated character');
        // next character is single quote
        this.iterator.next();
        image += "'";
        return new Token('CHARACTER_LITERAL', this.iterator.offset - image.length, image, value);
    }

    /**
     * Consume a sequence of valid operator characters
     */
    consumeOperator(image, next) {
        if (Tokenizer.OPER_CHARS.includes(next)) while (true) {
            const { value: [c, c1], done } = this.iterator.next();
            if (done) break;
            image += c;
            if (!Tokenizer.OPER_CHARS.includes(next)) break;
        }
        return new Token('OPER', this.iterator.offset - image.length, image);
    }

    /**
     * Consume any amount of spaces and tabs
     */
    consumeWhitespace(image, next) {
        if (next === ' ' || next === '\t') while (true) {
            const { value: [c, c1], done } = this.iterator.next();
            if (done) break;
            image += c;
            if (next !== ' ' && next !== '\t') break;
        }
        return new Token('WHITESPACE', this.iterator.offset - image.length, image);
    }

    /**
     * Returns true if c is a hexadecimal character
     */
    isHexidecimalDigit(c) {
        const low = c.toLowerCase();
        return (c >= '0' && c <= '9') || (low >= 'a' && low <= 'f');
    }
}
