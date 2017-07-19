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

    /**
     * These are the rules for the first character:
     * - lowercase letter: keyword
     *   - following characters should exactly match a keyword, followed by any non-identifier character to bound the token.
     *   - any failure to match the above specification should fall back to identifier
     * - letter or underscore: identifier
     *   - continue to match valid identifier characters until a non-identifier character to bound the token.
     * - dash: numeric literal
     *   - if followed by number, follow numeric rules below
     *   - otherwise, take as operator
     * - 0: zero, non-decimal integer, or floating point
     *   - if the following is not [XxEeBb.0-9], then it is 0.
     *   - if it is [Xx], it is a hexadecimal literal. consume [a-fA-F0-9]+ as the remainder of the token.
     *   - if it is [Bb], it is a binary literal. consume [01]+ as the remainder of the token.
     *   - if it is [0-9], it is a decimal (integer or floating) literal. consume [0-9]+
     *     - if next is [.], it is a floating literal. consume [0-9]+
     *       - if next is [Ee], consume [0-9]+ as the remainder of the token.
     *       - anything else, and the token is done.
     *   - if it is [.], it is a floating literal. consume [0-9]+
     *     - if next is [Ee], consume [0-9]+ as the remainder of the token.
     *     - anything else, and the token is done.
     *   - if next is [Ee], floating point. consume [0-9]+ as the remainder of the token.
     *   - anything else, token is just 0.
     * - [1-9]: numeric literal
     *   - consume [0-9]*
     *     - if next is [.], it is floating point. consume [0-9]+
     *       - if next is [Ee], consume [0-9]+ as the remainder of the token.
     *       - anything else, token is done.
     *     - if next is [Ee], it is floating point. consume [0-9]+ as the remainder of the token.
     *     - anything else, decimal integer literal
     * - ": string literal
     *   - consume anything but a " and a \.
     *   - if \, then consume escape sequence.
     *     - if [nrtvfb], insert these special escape characters.
     *     - if [Xx], insert ascii code
     *       - get [0-9A-Fa-f]{2}, parse code to character
     *     - if [Uu], insert unicode
     *       - if '{', check next 5 or 6 characters, should be [0-9A-Fa-f], followed by '}', parse code to character
     *       - otherwise, should be [0-9A-Fa-f]{4}, parse code to character
     *     - anything else, just take the character as it is
     *   - stop immediately at next ".
     * - ': character literal
     *   - consume JUST 1 of anything but a ' and a \.
     *   - if \, follow same rules as string above.
     *   - next character must be a '.
     * - [:{}()[],;`.=]: symbol
     *   - all are single characters except =.
     *   - if =
     *     - if >, take as fat_arrow
     *     - any other operator character, take as operator.
     * - [~!$%^&*+-|<>?/']: operator
     *   - consume any combination of operator characters, including =. (operators starting with = are handled above)
     * - (\r\n|\n|;): new line
     *   - any of these register as a new line character, which is a special class of whitespace (some expansions require being ended by a new line)
     *   - \r not followed by \n is regular whitespace
     * - [ \r\t]: whitespace
     *   - any combination of these characters registers as whitespace
     * - anything else is an invalid character (for now)
     *
     * So these are the lookahead requirements:
     * - keyword: 1
     * - identifier: 1
     * - integer literal: 3 (extra for -, 0x, 0b)
     * - floating point literal: 2 (extra for ., e)
     * - string literal: 10 (extra for \, \x, \u, \u{......})
     * - character literal: 10 (see above)
     * - symbol: 3 (extra for =>)
     * - operator: 1
     * - new line: 2 (extra for \r)
     * - whitespace: 1
     */
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
                    if (this.kind(c1) === 'number') cont(c, 'integer');
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
