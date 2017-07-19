import LookaheadIterator from './LookaheadIterator';


export class Token {
    constructor(type, offset, image = type, value = null) {
        this.type = type;
        this.offset = offset;
        this.image = image;
        this.value = value;
    }
}

const code = str => str.codePointAt(0);

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
        this.iterator = new LookaheadIterator(string, 1);
        this.offset = 0;
    }

    /**
     * Fully iterate the entire source string, extracting tokens according to the language's grammar rules and yielding each one.
     */
    *[Symbol.iterator]() {
        // these allow us to output useful line/column information (column is this.iterator.offset - currentLineOffset)
        let lineNumber = 1;
        let currentLineOffset = 0;

        // iterate the lookahead iterator
        for (const [c, c1] of this.iterator) {
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
                if (kind1 === 'number') yield this.consumeNumber(c, c1);
                // otherwise, consume it as an operator
                else yield this.consumeOperator(c, c1);
            } else if (kind === 'number') {
                // consume the number
                yield this.consumeNumber(c, c1);
            } else if (c === '"') {
                // consume a string literal
                yield this.consumeStringLiteral(c);
            } else if (c === "'") {
                // consume a character literal
                yield this.consumeCharacterLiteral(c);
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

    consumeNumber(image, next) {
        let negative = false;
        if (image === '-') {
            // number starts with minus, save that information and shift forward
            negative = true;
            [image, next] = this.iterator.next().value;
            // it may be that next was the last character in the source. handle that here.
            if (!next) return new Token('INTEGER_LITERAL', this.iterator.offset - 2, `-${image}`, -parseInt(image, 10));
        }
        if (image === '0') {
            // handle all the nasty crap that comes with a number that starts with 0.
            if (next.toLowerCase() === 'x') {
                image += next;
                this.iterator.next();
                image += this.consumeHexLiteral();
                const value = parseInt(image.substring(2), 16);
                return new Token('INTEGER_LITERAL', this.iterator.offset - image.length, image, negative ? -value : value);
            } else if (next.toLowerCase() === 'b') {
                image += next;
                this.iterator.next();
                image += this.consumeBinaryLiteral();
                const value = parseInt(image.substring(2), 2);
                return new Token('INTEGER_LITERAL', this.iterator.offset - image.length, image, negative ? -value : value);
            } else if (next === '.' || next.toLowerCase() === 'e') {
                image = this.consumeFloatLiteral(image, next);
                const value = parseFloat(image);
                return new Token('FLOAT_LITERAL', this.iterator.offset - image.length, image, negative ? -value : value);
            } else {
                return this.consumeInteger(image, next);
            }
        } else {
            return this.consumeInteger(image, next);
        }
    }

    /**
     * Consume all hexadecimal digits starting from the next offset of the iterator
     */
    consumeHexLiteral() {
        // TODO: handle the case where we have a 0x with no hex digits after
    }

    /**
     * Consume all binary digits starting from the next offset of the iterator
     */
    consumeBinaryLiteral() {
        // TODO: handle the case where we have a 0b with no binary digits after
    }

    /**
     * Given a starting image and an initial next character, consume an entire floating point literal
     */
    consumeFloatLiteral(image, next) {
        // TODO
    }

    /**
     * Given a starting image and an initial next character, consume an entire integer literal (may encounter a floating point literal)
     */
    consumeIntegerLiteral(image, next) {
        // TODO
    }

    /**
     * Given a starting image (") and an initial next character, consume an entire string literal
     */
    consumeStringLiteral(image, next) {
        // TODO
    }

    /**
     * Given a starting image (') and an initial next character, consume an entire character literal
     */
    consumeCharacterLiteral(image, next) {
        // TODO
    }

    consumeOperator(image, next) {
        if (Tokenizer.OPER_CHARS.includes(next)) while (true) {
            const { value: [c, c1], done } = this.iterator.next();
            if (done) break;
            image += c;
            if (!Tokenizer.OPER_CHARS.includes(next)) break;
        }
        return new Token('OPER', this.iterator.offset - image.length, image);
    }

    consumeWhitespace(image, next) {
        if (next === ' ' || next === '\t') while (true) {
            const { value: [c, c1], done } = this.iterator.next();
            if (done) break;
            image += c;
            if (next !== ' ' && next !== '\t') break;
        }
        return new Token('WHITESPACE', this.iterator.offset - image.length, image);
    }

    // EVERYTHING BELOW THIS IS OLD LOGIC

    *[Symbol.iterator]() {
        let image = '';       // progressive image of current token being analyzed
        let state = 'start';  // current state of tokenizer state machine
        let lineNumber = 1;   // current line number in file (the number of \n characters consumed so far, plus 1)
        let columnNumber = 1; // current column number in line (the number of characters consumed in the current line, plus 1)
        let offset = 0;       // current 0-based character offset in the file, never resets

        // continue with a new character to add to the image and the specified next state
        const cont = (c, s) => [image, state] = [image + c, s];
        // create a new token, reset the state for a new token, return the token
        const tok = (type, c) => {
            const token = new Token(type, offset - image.length, image + c);
            [image, state] = ['', 'start'];
            return token;
        }

        // using the lookahead iterator, iterate each character in the file
        for (const buf of this.iterator) {
            const [c, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10] = buf; // iterator yields a lookahead buffer
            const kind = this.kind(c); // 'uppercase', 'lowercase', 'number', or the original character

            // This is a state machine that goes off of the current state and the kind of the next character.
            // The goal is to either match the end of a token (tok), or continue consuming characters for a selected token type (cont).
            // The cases are ordered a particular way, for example a token should match a keyword before matching an identifier.
            switch (`${state}_${kind}`) {
                case 'start_lowercase':
                case 'keyword_lowercase': switch (this.matchKeyword(image, c, c1)) {
                    case 'match': yield tok((image + c).toUpperCase(), c);
                    case 'cont': cont(c, 'keyword'); break;
                    default:
                        if (this.matchIdent(image, c, c1)) yield tok('IDENT', c);
                        else cont(c, 'ident'); break;
                }
                case 'ident_lowercase':
                case 'ident_uppercase':
                case 'ident__':
                    if (this.matchIdent(image, c, c1)) yield tok('IDENT', c);
                    else cont(c, 'ident'); break;
                case 'start_-':
                    if (this.kind(c1) === 'number') (c1 === '0') ? cont(c, 'zero') : cont(c, 'integer');
                    else if (this.matchOper(image, c, c1)) yield tok('OPER', c);
                    else cont(c, 'oper'); break;
                case 'oper_-':
                    if (this.matchOper(image, c, c1)) yield tok('OPER', c);
                    else cont(c, 'oper'); break;
                case 'start_number':
                case 'integer_number': // TODO: x and b belong under 'start'
                    if (c === '0') switch (this.kind(c1.toLowerCase())) {
                        case 'lowercase': switch (c1.toLowerCase()) {
                            case 'x': cont(c, 'hex');
                            case 'b': cont(c, 'bin');
                            case 'e': cont(c, 'float');
                            default: yield tok('INTEGER_LITERAL', c);
                        }
                        case 'number': cont(c, 'integer');
                        case '.': cont(c, 'float');
                        default: yield tok('INTEGER_LITERAL', c);
                    } else switch (this.kind(c1.toLowerCase())) {
                        case 'lowercase':
                            if (c1.toLowerCase() === 'e') cont(c, 'float');
                            else yield tok('INTEGER_LITERAL', c);
                        case 'number': cont(c, 'integer');
                        case '.': cont(c, 'float');
                        default: yield tok('INTEGER_LITERAL', c);
                    }
                case 'hex_uppercase': // TODO: we need a hex_start state to differentiate between before and after we've seen the x
                case 'hex_lowercase': switch (c.toLowerCase()) {
                    case 'x': cont(c, 'hex');
                    case 'a': case 'b': case 'c':
                    case 'd': case 'e': case 'f': cont(c, 'hex');
                    default: throw new Error
                }
                case 'bin_uppercase':
                case 'bin_lowercase': cont(c, 'bin'); // there is no way that 'c' can be anything but 'b' or 'B'.
                // TODO: finish: hex, bin, integer, float
                // TODO: start: string, char, symbol, operator, newline, whitespace
                default: throw new Error(`Invalid character ${c} at line ${lineNumber}, column ${columnNumber}.`);
            }
            offset++;
            columnNumber++;
        }
    }

    kind(char) {
        const ccode = code(char);
        if (char >= 'a' && char <= 'z') return 'lowercase';
        else if (char >= 'A' && char <= 'Z') return 'uppercase';
        else if (char >= '0' && char <= '9') return 'number';
        else return char;
    }

    /**
     * If the current state is checking for a keyword match, determine (by the current token image, the next character, and the 1st lookahead)
     * whether:
     * - we have an exact match for a keyword
     * - we may have a match but we need the next character
     * - there is no match
     */
    matchKeyword(image, c, c1) {
        const current = image + c;
        let cont = false;
        for (const kw of Tokenizer.KEYWORD_TOKENS) {
            // check to see if the keyword starts with the current image buffer
            if (kw.startsWith(current)) {
                // it does, check to see if it is an exact match
                if (kw === current) {
                    // it is, make sure the lookahead character bounds the token; if so, we have an exact match
                    if (this.ibound(c1)) return 'match';
                    // if not, it may still match another, but we don't yet know for sure
                } else {
                    // not an exact match, but it still matches partly, we need more information
                    cont = true;
                }
            }
        }
        // if a keyword requested more characters, indicate so, otherwise there was no match
        return cont ? 'cont' : false;
    }

    /**
     * Test whether a lookahead character sets a bound for a preceding identifier or keyword token
     */
    ibound(c) {
        return !this.isValidIdentChar(c);
    }

    // EVERYTHING BELOW IS OLD LOGIC

    /**
     * We have matched a character that is a valid start of an identifier.
     * Continue to consume characters until the identifier is done.
     */
    getIdent() {
        let char = this.nextChar();
        let char;
        while (this.isValidIdentChar(char = this.iterator.next()[0]))
        const ccode = code(char.toLowerCase());
        if (char !== '_' && (ccode < Tokenizer.LOW_A || ccode > Tokenizer.LOW_Z)) {
            this._prev();
            return false;
        }

        let image = char;
        while (this.isValidIdentChar(char = this.nextChar())) image += char;
        return new Token('ident', start, image);
    }

    /**
     * get a string containing the next 'times' characters
     */
    nextChars(times) {
        let str = '';
        for (let i = 0; i < times; ++i) {
            // get the next character
            const char = this.nextChar();
            if (char === Tokenizer.EOF) {
                // if it was EOF, there aren't enough characters, rewind and return false
                this._prevs(i + 1);
                return false;
            }
            str += char;
        }
        return str;
    }

    /**
     * get the next character in the sequence, incrementing the offset
     */
    nextChar() {
        let next, done = false;

        if (this.reversed.length) {
            // if we reversed the list, take from this first
            next = this.reversed.shift();
        } else {
            // otherwise, grab the next value from the iterator
            const inext = this.iterator.next();
            // detect when we are done
            if (inext.done) done = true;
            else next = inext.value;
        }

        if (!done) {
            // hold onto the value in case we want to go back
            this.iterated.push(next);
            this.offset++;
            return next;
        }

        // if we're done, return EOF
        return Tokenizer.EOF;
    }

    /**
     * Move the iterator back 'times' characters
     */
    _prevs(times) {
        for (let i = 0; i < times; ++i) this._prev();
    }

    /**
     * Move the iterator back one character, decrementing the offset=
     */
    _prev() {
        if (!this.iterated.length) return;
        // pop off the end of the iterated list and add to the start of the reversed list
        this.reversed.unshift(this.iterated.pop());
        this.offset--;
    }

    /**
     * Reset the iterator to the specified position
     */
    reset(offset) {
        this._prevs(this.offset - offset);
    }

    // Token extraction functions

    /**
     * Get a token matching the exact specified string
     */
    getStaticToken(str, type = str) {
        const offset = this.offset;
        // try to get a token of the same length
        const tok = this.nextChars(str.length);
        // if they were equal, it was a match
        if (tok === str) return new Token(type, offset);
        // if it was false, there weren't enough characters left in the input
        if (!tok) return false;
        // otherwise, there was no match; rewind and return false
        this.reset(offset);
        return false;
    }

    /**
     * Get a string literal token
     */
    getStringLiteral() {
        const start = this.offset;
        const delimiter = this.nextChar();
        if (delimiter !== '"') {
            this._prev();
            return false;
        }
        let char;
        let image = '"';
        let value = '';
        while ((char = this.nextChar()) !== '"') {
            if (char === '\\') {
                const escaped = this.nextChar();
                image += `\\${escaped}`;
                switch (escaped) {
                    case 'n': value += '\n'; break; // new line
                    case 'r': value += '\r'; break; // carriage return
                    case 't': value += '\t'; break; // tab
                    case 'f': value += '\f'; break;
                    case 'b': value += '\b'; break; // backspace
                    case 'v': value += '\v'; break; // vertical tab
                    case 'x': value += this.getHexSequence(); break; // ascii code
                    case 'u': { // unicode sequence
                        if (this.nextChar() === '{') {
                            // get a potential 3 byte sequence (assuming the syntax is correct)
                            const seq = this.get3ByteUnicodeSequence();
                            if (!seq) {
                                // if the syntax wasn't correct, reset and return
                                this.reset(start);
                                return false;
                            }
                            value += seq;
                        } else {
                            // if the '{' wasn't there, then it is a simple 4 hex digit sequence
                            this._prev();
                            value += this.get2ByteUnicodeSequence();
                        }
                        break;
                    }
                    default: value += escaped; break; // any other character, just treat it normally
                }
            } else {
                image += char;
                value += char;
            }
        }
        image += '"';
        return new Token('string_literal', start, image, value);
    }

    /**
     * Get a character literal token
     */
    getCharLiteral() {
        const start = this.offset;
        const delimiter = this.nextChar();
        if (delimiter !== "'") {
            this._prev();
            return false;
        }
        const char = this.nextChar();
        let image = "'";
        let value;
        if (char === '\\') {
            const escaped = this.nextChar();
            image += `\\${escaped}`;
            switch (escaped) {
                case 'n': value = '\n'; break; // new line
                case 'r': value = '\r'; break; // carriage return
                case 't': value = '\t'; break; // tab
                case 'f': value = '\f'; break;
                case 'b': value = '\b'; break; // backspace
                case 'v': value = '\v'; break; // vertical tab
                case 'x': value = this.getHexSequence(); break; // ascii code
                case 'u': { // unicode sequence
                    if (this.nextChar() === '{') {
                        // get a potential 3 byte sequence (assuming the syntax is correct)
                        const seq = this.get3ByteUnicodeSequence();
                        if (!seq) {
                            // if the syntax wasn't correct, reset and return
                            this.reset(start);
                            return false;
                        }
                        value = seq;
                    } else {
                        // if the '{' wasn't there, then it is a simple 4 hex digit sequence
                        this._prev();
                        value = this.get2ByteUnicodeSequence();
                    }
                    break;
                }
                default: value += escaped; break; // any other character, just treat it normally
            }
        } else {
            image += char;
            value = char;
        }
        if (this.nextChar() !== "'") {
            this.reset(start);
            return false;
        }
        image += "'";
        return new Token('char_literal', start, image, value);
    }

    /**
     * Get an OPERATOR token
     */
    getOperator() {
        const start = this.offset;
        let char = this.nextChar();
        if (!Tokenizer.OPER_CHARS.includes(char)) {
            this._prev();
            return false;
        }

        let image = char;
        while (Tokenizer.OPER_CHARS.includes(char = this.nextChar())) image += char;
        return new Token('operator', start, image);
    }

    /**
     * Get an integer literal token
     */
    getIntegerLiteral() {
        const start = this.offset;
        let char = this.nextChar();
        let ccode = code(char);
        let image = char;
        let value;
        if (char === '-') {
            char = this.nextChar();
        }
        if (char === '0') {
            char = this.nextChar();
            ccode = code(char);
            if (ccode >= Tokenizer.ZERO && ccode <= Tokenizer.NINE) {
                this.reset(start);
                return false; // zero can't be followed by a number
            } else if (char.toLowerCase() === 'x') {
                // hexadecimal literal
                let hexVal = '';
                while (this.isHexidecimalDigit(char = this.nextChar())) hexVal += char;
                image += `x${hexVal}`;
                value = parseInt(hexVal, 16);
            } else if (char.toLowerCase() === 'b') {
                // binary literal
                let binVal = '';
                while (this.isBinaryDigit(char = this.nextChar())) binVal += char;
                image += `b${binVal}`;
                value = parseInt(binVal, 2);
            } else {
                // straight zero
                this._prev();
                value = 0;
            }
        } else if (this.isDecimalDigit(char)) {
            // decimal literal
            while (this.isDecimalDigit(char = this.nextChar())) image += char;
            value = parseInt(image, 10);
        } else {
            this.reset(start);
            return false; // not a valid integer
        }
        return new Token('integer_literal', start, image, value);
    }

    /**
     * Get a floating point literal token
     */
    getFloatingPointLiteral() {
        const start = this.offset;
        let char = this.nextChar();
        let image = char;
        // negative flag
        if (char === '-') {
            char = this.nextChar();
            image += char;
        }
        // integer portion
        if (this.isDecimalDigit(char)) {
            while (this.isDecimalDigit(char = this.nextChar())) image += char;
        } else {
            this.reset(start);
            return false;
        }
        // fractional portion
        if (char === '.') {
            image += char;
            if (this.isDecimalDigit(char = this.nextChar())) {
                image += char;
                // tenths place and down
                while (this.isDecimalDigit(char = this.nextChar())) image += char;
            } else {
                this.reset(start);
                return false;
            }
        }
        // exponential notation portion
        if (char.toLowerCase() === 'e') {
            image += char;
            if (this.isDecimalDigit(char = this.nextChar())) {
                image += char;
                while (this.isDecimalDigit(char = this.nextChar())) image += char;
            } else {
                this.reset(start);
                return false;
            }
        }
        return new Token('floating_point_literal', start, image, parseFloat(image));
    }

    /**
     * Get a whitespace token TODO: this is outdated logic
     */
    getWhiteSpace(allowSemicolon = false) {
        const chars = allowSemicolon ? [';', ...Tokenizer.WHITESPACE_CHARS] : Tokenizer.WHITESPACE_CHARS;
        const start = this.offset;
        let char = this.nextChar();
        let image = char;
        if (!chars.includes(char)) {
            this._prev();
            return false;
        }
        while (chars.includes(char = this.nextChar())) image += char;
        return new Token('whitespace', start, image);
    }

    /**
     * Consume any whitespace after the current offset.
     * Semicolon is an explicit line delimiter.
     * If you expect a new line, there must be at least one semi or new line character in the whitespace.
     */
    consumeWhiteSpace(expectNewLine = false) {
        let char;
        let hasAny = false;
        let hasNewLine = false;
        while (Tokenizer.WHITESPACE_CHARS.includes(char = this.nextChar())) {
            hasAny = true;
            if (!hasNewLine && expectNewLine && (char === ';' || char === '\n')) hasNewLine = true;
        }
        this._prev();
        // if you expect a new line, accept only if there was at least one "new line"
        // if not, accept only if there was any whitespace at all
        return expectNewLine ? hasNewLine : hasAny;
    }

    // Token helper functions

    getHexSequence() {
        const strCode = this.nextChars(2);
        const ccode = parseInt(strCode, 16);
        return String.fromCodePoint(ccode);
    }

    get2ByteUnicodeSequence() {
        const strCode = this.nextChars(4);
        const ccode = parseInt(strCode, 16);
        return String.fromCodePoint(ccode);
    }

    get3ByteUnicodeSequence() {
        let strCode = this.nextChars(5);
        let nextChar = this.nextChar();
        if (nextChar !== '}') strCode += nextChar;
        nextChar = this.nextChar();
        if (nextChar !== '}') return false;
        const ccode = parseInt(strCode, 16);
        return String.fromCodePoint(ccode);
    }

    isValidIdentStartChar(chr) {
        const ccode = code(chr.toLowerCase());
        return (ccode >= Tokenizer.LOW_A && ccode <= Tokenizer.LOW_Z)
            || chr === '_';
    }

    isValidIdentChar(chr) {
        const ccode = code(chr.toLowerCase());
        return (ccode >= Tokenizer.LOW_A && ccode <= Tokenizer.LOW_Z)
            || (ccode >= Tokenizer.ZERO && ccode <= Tokenizer.NINE)
            || chr === '_';
    }

    isHexidecimalDigit(char) {
        const ccode = code(char.toLowerCase());
        return (ccode >= Tokenizer.ZERO && ccode <= Tokenizer.NINE)
            || (ccode >= Tokenizer.LOW_A && ccode <= Tokenizer.LOW_F);
    }

    isBinaryDigit(char) {
        return char === '0' || char === '1';
    }

    isDecimalDigit(char) {
        const ccode = code(char);
        return ccode >= Tokenizer.ZERO && ccode <= Tokenizer.NINE;
    }
}
