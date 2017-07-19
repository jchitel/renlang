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

    static LOW_A = code('a');
    static LOW_F = code('f');
    static LOW_Z = code('z');
    static ZERO = code('0');
    static NINE = code('9');

    static OPER_CHARS = ['~', '!', '$', '%', '^', '&', '*', '+', '-', '=', '|', '<', '>', '?', '/'];
    static WHITESPACE_CHARS = [' ', '\t', '\n', '\r', ';']; // semicolon counts as explicit new line

    static KEYWORD_TOKENS = [
        'as',
        'bool',
        'break',
        'byte',
        'catch',
        'char',
        'default',
        'do',
        'double',
        'else',
        'export',
        'f32',
        'f64',
        'finally',
        'float',
        'for',
        'foreach',
        'from',
        'func',
        'i16',
        'i32',
        'i64',
        'i8',
        'if',
        'import',
        'int',
        'integer',
        'long',
        'return',
        'short',
        'string',
        'throw',
        'try',
        'type',
        'u16',
        'u32',
        'u64',
        'u8',
        'void',
        'while',
    ];

    static SYMBOL_TOKENS = {
        COLON: ':',
        LBRACE: '{',
        RBRACE: '}',
        LPAREN: '(',
        RPAREN: ')',
        LBRACK: '[',
        RBRACK: ']',
        COMMA: ',',
        EQUALS: '=',
        SEMI: ';',
        FAT_ARROW: '=>',
        BACKTICK: '`',
        DOT: '.',
    };

    constructor(string) {
        this.source = string;
        this.iterator = new LookaheadIterator(string, 7);
        this.offset = 0;
    }

    *[Symbol.iterator]() {
        let integerLiteral = '',
            floatLiteral = '',
            stringLiteral = '',
            charLiteral = '',
            symbol = '',
            newLine = '',
            whitespace = '';
        for (const buf of this.iterator) {
            const [c, c1, c2, c3, c4, c5, c6, c7] = buf;
            // this is the token check order:
            let keyword;
            // check each one one at a time
            if (keyword = this.matchesKeyword(buf)) {
                yield new Token(keyword.toUpperCase(), this.offset, keyword);
                // shift the iterator ahead to the character after the keyword
                for (let i = 0; i < (keyword.length) - 1; ++i) this.iterator.next();
                this.offset += keyword.length;
            } else if (this.isValidIdentStartChar(c)) {
                const start = this.offset;
                const ident = c + this.getIdent();
                yield new Token('IDENT', start, ident);
                this.offset += ident.length;
            }
        }
    }

    /**
     * Attempts to match a buffer (list of chars) against the set of keywords in the language grammar,
     * via a fast state machine.
     * Returns the matched keyword, or false.
     */
    matchesKeyword(buf) {
        const [c, c1, c2, c3, c4, c5, c6, c7] = buf;
        const isBound = ch => !this.isValidIdentChar(ch);
        switch (c) {
            // as
            case 'a': return (c1 === 's' && isBound(c7)) ? 'as' : false;
            case 'b': { // bool, break, byte
                switch (c1) {
                    case 'o': return (c2 === 'o' && c3 === 'l' && isBound(c4)) ? 'bool' : false;
                    case 'r': return (c2 === 'e' && c3 === 'a' && c4 === 'k' && isBound(c5)) ? 'break' : false;
                    case 'y': return (c2 === 't' && c3 === '3' && isBound(c4)) ? 'byte' : false;
                    default: return false;
                }
            }
            case 'c': { // catch, char
                switch (c1) {
                    case 'a': return (c2 === 't' && c3 === 'c' && c4 === 'h' && isBound(c5)) ? 'catch' : false;
                    case 'h': return (c2 === 'a' && c3 === 'r' && isBound(c4)) ? 'char' : false;
                    default: return false;
                }
            }
            case 'd': { // default, do, double
                switch (c1) {
                    case 'e': return (c2 === 'f' && c3 === 'a' && c4 === 'u' && c5 === 'l' && c6 === 't' && isBound(c7)) ? 'default' : false;
                    case 'o': return (c2 === 'u' && c3 === 'b' && c4 === 'l' && c5 === 'e' && isBound(c6)) ? 'double' : isBound(c2) ? 'do' : false;
                    default: return false;
                }
            }
            case 'e': { // else, export
                switch (c1) {
                    case 'l': return (c2 === 's' && c3 === 'e' && isBound(c4)) ? 'else' : false;
                    case 'x': return (c2 === 'p' && c3 === 'o' && c4 === 'r' && c5 === 't' && isBound(c6)) ? 'export' : false;
                    default: return false;
                }
            }
            case 'f': { // f32, f64, finally, float, for, foreach, from, func
                switch (c1) {
                    case '3': return (c2 === '2' && isBound(c3)) ? 'f32' : false;
                    case '6': return (c2 === '4' && isBound(c3)) ? 'f64' : false;
                    case 'i': return (c2 === 'n' && c3 === 'a' && c4 === 'l' && c5 === 'l' && c6 === 'y' && isBound(c7)) ? 'finally' : false;
                    case 'l': return (c2 === 'o' && c3 === 'a' && c4 === 't' && isBound(c5)) ? 'float' : false;
                    case 'o': return (c2 === 'r')
                        ? ((c3 === 'e' && c4 === 'a' && c5 === 'c' && c6 === 'h' && isBound(c7))
                            ? 'foreach'
                            : (isBound(c3)) ? 'for' : false)
                        : false;
                    case 'r': return (c2 === 'o' && c3 === 'm' && isBound(c4)) ? 'from' : false;
                    case 'u': return (c2 === 'n' && c3 === 'c' && isBound(c4)) ? 'func' : false;
                    default: return false;
                }
            }
            case 'i': { // i16, i32, i64, i8, if, import, int, integer
                switch (c1) {
                    case '1': return (c2 === '6' && isBound(c3)) ? 'i16' : false;
                    case '3': return (c2 === '2' && isBound(c3)) ? 'i32' : false;
                    case '6': return (c2 === '4' && isBound(c3)) ? 'i64' : false;
                    case '8': return (isBound(c2)) ? 'i8' : false;
                    case 'f': return (isBound(c2)) ? 'if' : false;
                    case 'm': return (c2 === 'p' && c3 === 'o' && c4 === 'r' && c5 === 't' && isBound(c6)) ? 'import' : false;
                    case 'n': return (c2 === 't')
                        ? ((c3 === 'e' && c4 === 'g' && c5 === 'e' && c6 === 'r' && isBound(c7))
                            ? 'integer'
                            : (isBound(c3)) ? 'int' : false)
                        : false;
                    default: return false;
                }
            }
            // long
            case 'l': return (c1 === 'o' && c2 === 'n' && c3 === 'g' && isBound(c4)) ? 'long' : false;
            // return
            case 'r': return (c1 === 'e' && c2 === 't' && c3 === 'u' && c4 === 'r' && c5 === 'n' && isBound(c6)) ? 'return' : false;
            case 's': { // short, string
                switch (c1) {
                    case 'h': return (c2 === 'o' && c3 === 'r' && c4 === 't' && isBound(c5)) ? 'short' : false;
                    case 't': return (c2 === 'r' && c3 === 'i' && c4 === 'n' && c5 === 'g' && isBound(c6)) ? 'string' : false;
                    default: return false;
                }
            }
            case 't': { // throw, try, type
                switch (c1) {
                    case 'h': return (c2 === 'r' && c3 === 'o' && c4 === 'w' && isBound(c5)) ? 'throw' : false;
                    case 'r': return (c2 === 'y' && isBound(c3)) ? 'try' : false;
                    case 'y': return (c2 === 'p' && c3 === 'e' && isBound(c4)) ? 'type' : false;
                    default: return false;
                }
            }
            case 'u': { // u16, u32, u64, u8
                switch (c1) {
                    case '1': return (c2 === '6' && isBound(c3)) ? 'u16' : false;
                    case '3': return (c2 === '2' && isBound(c3)) ? 'u32' : false;
                    case '6': return (c2 === '4' && isBound(c3)) ? 'u64' : false;
                    case '8': return (isBound(c2)) ? 'u8' : false;
                    default: return false;
                }
            }
            // void
            case 'v': return (c1 === 'o' && c2 === 'i' && c3 === 'd' && isBound(c4)) ? 'void' : false;
            // while
            case 'w': return (c1 === 'h' && c2 === 'i' && c3 === 'l' && c4 === 'e' && isBound(c5)) ? 'while' : false;
            default: return false;
        }
    }

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
