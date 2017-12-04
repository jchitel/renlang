import { assert } from 'chai';

import Tokenizer, { Token, TokenType, RESERVED } from '~/parser/Tokenizer';


function getTokens(str: string, flipIgnore = false) {
    if (!flipIgnore) return [...new Tokenizer(str)];
    const tokenizer = new Tokenizer(str);
    tokenizer.ignoreMode = false;
    return [...tokenizer];
}

function assertSingleToken(str: string, type: TokenType, value?: any) {
    const [token] = getTokens(str, true);
    assert.deepEqual(token, new Token(type, 1, 1, str, value));
}

describe('Tokenizer', () => {
    it('should construct a lazy list', () => {
        const tokenizer = new Tokenizer('hello');
        assert.strictEqual(tokenizer.list.peek(), 'h');
    });

    it('should consume a single-line comment', () => {
        assertSingleToken('// this is a comment', TokenType.COMMENT);
        assertSingleToken('//this is a comment\n', TokenType.COMMENT);
    });

    it('should consume a multi-line comment', () => {
        assertSingleToken('/* this is a comment */', TokenType.COMMENT);
        assertSingleToken('/* this is a comment', TokenType.COMMENT);
        assertSingleToken('/* this is a comment\nand another line */', TokenType.COMMENT);
    });

    it('should consume reserved words', () => {
        for (const reserved of RESERVED) assertSingleToken(reserved, TokenType.RESERVED);
    })

    it('should consume an identifier', () => {
        assertSingleToken('hello', TokenType.IDENT);
        assertSingleToken('h', TokenType.IDENT);
        assertSingleToken('HeLl0', TokenType.IDENT);
        assertSingleToken('_hello', TokenType.IDENT);
        assertSingleToken('h_E_l_L_o', TokenType.IDENT);
        assertSingleToken('h3110', TokenType.IDENT);
    });

    it('should consume an integer', () => {
        assertSingleToken('1', TokenType.INTEGER_LITERAL, 1);
        assertSingleToken('31415926', TokenType.INTEGER_LITERAL, 31415926);
        assertSingleToken('0', TokenType.INTEGER_LITERAL, 0);
        assertSingleToken('01', TokenType.INTEGER_LITERAL, 1);
    });

    it('should consume a hexadecimal literal', () => {
        assertSingleToken('0x1f', TokenType.INTEGER_LITERAL, 31);
    });

    it("should handle '0x' case", () => {
        const tokens = getTokens('0x ');
        assert.deepEqual(tokens, [
            new Token(TokenType.INTEGER_LITERAL, 1, 1, '0', 0),
            new Token(TokenType.IDENT, 1, 2, 'x'),
            new Token(TokenType.EOF, 1, 4, ''),
        ]);
    });

    it('should consume a binary literal', () => {
        assertSingleToken('0b11011', TokenType.INTEGER_LITERAL, 27);
    });

    it("should handle '0b' case", () => {
        const tokens = getTokens('0b ');
        assert.deepEqual(tokens, [
            new Token(TokenType.INTEGER_LITERAL, 1, 1, '0', 0),
            new Token(TokenType.IDENT, 1, 2, 'b'),
            new Token(TokenType.EOF, 1, 4, ''),
        ]);
    });

    it('should consume a floating point literal', () => {
        assertSingleToken('0.1', TokenType.FLOAT_LITERAL, 0.1);
        assertSingleToken('0.12', TokenType.FLOAT_LITERAL, 0.12);
        assertSingleToken('0e1', TokenType.FLOAT_LITERAL, 0);
        assertSingleToken('0.1e2', TokenType.FLOAT_LITERAL, 10);
        assertSingleToken('1e12', TokenType.FLOAT_LITERAL, 1e12);
        assertSingleToken('123.456', TokenType.FLOAT_LITERAL, 123.456);
    });

    it("should handle '0.' and '0e' case", () => {
        let tokens = getTokens('0. ');
        assert.deepEqual(tokens, [
            new Token(TokenType.INTEGER_LITERAL, 1, 1, '0', 0),
            new Token(TokenType.DOT, 1, 2, '.'),
            new Token(TokenType.EOF, 1, 4, ''),
        ]);

        tokens = getTokens('0e ');
        assert.deepEqual(tokens, [
            new Token(TokenType.INTEGER_LITERAL, 1, 1, '0', 0),
            new Token(TokenType.IDENT, 1, 2, 'e'),
            new Token(TokenType.EOF, 1, 4, ''),
        ]);

        tokens = getTokens('0.1e ');
        assert.deepEqual(tokens, [
            new Token(TokenType.FLOAT_LITERAL, 1, 1, '0.1', 0.1),
            new Token(TokenType.IDENT, 1, 4, 'e'),
            new Token(TokenType.EOF, 1, 6, ''),
        ]);

        tokens = getTokens('123. ');
        assert.deepEqual(tokens, [
            new Token(TokenType.INTEGER_LITERAL, 1, 1, '123', 123),
            new Token(TokenType.DOT, 1, 4, '.'),
            new Token(TokenType.EOF, 1, 6, ''),
        ]);
    });

    it('should handle 0 followed by an invalid numeric character', () => {
        const tokens = getTokens('0c ');
        assert.deepEqual(tokens, [
            new Token(TokenType.INTEGER_LITERAL, 1, 1, '0', 0),
            new Token(TokenType.IDENT, 1, 2, 'c'),
            new Token(TokenType.EOF, 1, 4, ''),
        ]);
    });

    it('should consume lonely minus as operator', () => {
        assertSingleToken('-', TokenType.OPER);
        assertSingleToken('-+', TokenType.OPER);
    });

    it('should consume a string literal', () => {
        assertSingleToken('""', TokenType.STRING_LITERAL, '');
        assertSingleToken('"hello"', TokenType.STRING_LITERAL, 'hello');
    });

    it('should handle simple escape characters in strings', () => {
        assertSingleToken('"\\n"', TokenType.STRING_LITERAL, '\n');
        assertSingleToken('"\\r"', TokenType.STRING_LITERAL, '\r');
        assertSingleToken('"\\t"', TokenType.STRING_LITERAL, '\t');
        assertSingleToken('"\\v"', TokenType.STRING_LITERAL, '\v');
        assertSingleToken('"\\f"', TokenType.STRING_LITERAL, '\f');
        assertSingleToken('"\\b"', TokenType.STRING_LITERAL, '\b');
        assertSingleToken('"\\a"', TokenType.STRING_LITERAL, 'a');
    });

    it('should handle ascii escape sequences in strings', () => {
        assertSingleToken('"\\x61"', TokenType.STRING_LITERAL, 'a');
        assertSingleToken('"\\xn1"', TokenType.STRING_LITERAL, 'xn1');
    });

    it('should handle unicode escape sequences in strings', () => {
        assertSingleToken('"\\u0061"', TokenType.STRING_LITERAL, 'a');
        assertSingleToken('"\\u{00061}"', TokenType.STRING_LITERAL, 'a');
        assertSingleToken('"\\u{000061}"', TokenType.STRING_LITERAL, 'a');
        assertSingleToken('"\\u00n1"', TokenType.STRING_LITERAL, 'u00n1');
    });

    it('should throw an error for unterminated string', () => {
        assert.throws(() => getTokens('"'), 'Unterminated string (Line 1, Column 1)');
        assert.throws(() => getTokens('"abcd'), 'Unterminated string (Line 1, Column 5)');
    });

    it('should consume a character literal', () => {
        assertSingleToken("'a'", TokenType.CHARACTER_LITERAL, 'a');
    });

    it('should handle simple escape characters in characters', () => {
        assertSingleToken("'\\n'", TokenType.CHARACTER_LITERAL, '\n');
        assertSingleToken("'\\r'", TokenType.CHARACTER_LITERAL, '\r');
        assertSingleToken("'\\t'", TokenType.CHARACTER_LITERAL, '\t');
        assertSingleToken("'\\v'", TokenType.CHARACTER_LITERAL, '\v');
        assertSingleToken("'\\f'", TokenType.CHARACTER_LITERAL, '\f');
        assertSingleToken("'\\b'", TokenType.CHARACTER_LITERAL, '\b');
        assertSingleToken("'\\a'", TokenType.CHARACTER_LITERAL, 'a');
    });

    it('should handle ascii escape sequences in characters', () => {
        assertSingleToken("'\\x61'", TokenType.CHARACTER_LITERAL, 'a');
        assert.throws(() => getTokens("'\\xn1'"), 'Unterminated character (Line 1, Column 6)');
    });

    it('should handle unicode escape sequences in characters', () => {
        assertSingleToken("'\\u0061'", TokenType.CHARACTER_LITERAL, 'a');
        assertSingleToken("'\\u{00061}'", TokenType.CHARACTER_LITERAL, 'a');
        assertSingleToken("'\\u{000061}'", TokenType.CHARACTER_LITERAL, 'a');
        assert.throws(() => getTokens("'\\u00n1'"), 'Unterminated character (Line 1, Column 8)');
    });

    it('should throw an error for invalid character literal', () => {
        assert.throws(() => getTokens("'"), 'Unterminated character (Line 1, Column 1)');
        assert.throws(() => getTokens("'a"), 'Unterminated character (Line 1, Column 2)');
        assert.throws(() => getTokens("''"), 'Empty character (Line 1, Column 2)');
    });

    it('should consume a non-equals symbol', () => {
        assertSingleToken(':', TokenType.COLON);
        assertSingleToken('{', TokenType.LBRACE);
        assertSingleToken('}', TokenType.RBRACE);
        assertSingleToken('(', TokenType.LPAREN);
        assertSingleToken(')', TokenType.RPAREN);
        assertSingleToken('[', TokenType.LBRACK);
        assertSingleToken(']', TokenType.RBRACK);
        assertSingleToken(':', TokenType.COLON);
        assertSingleToken(',', TokenType.COMMA);
        assertSingleToken('`', TokenType.BACKTICK);
        assertSingleToken('.', TokenType.DOT);
    });

    it('should consume a symbol starting with an equals', () => {
        assertSingleToken('=>', TokenType.FAT_ARROW);
        assertSingleToken('=', TokenType.EQUALS);
    });

    it('should consume an operator starting with equals', () => {
        assertSingleToken('=+', TokenType.OPER);
    });

    it('should consume an operator', () => {
        for (const c of Tokenizer.OPER_CHARS) {
            if (c === '=') continue; // lonely equals is a special case
            assertSingleToken(c, TokenType.OPER);
        }
        assertSingleToken('~!$%^&+=-|</', TokenType.OPER);
    });

    it('should consume a new line token', () => {
        assertSingleToken('\n', TokenType.NEWLINE);
        assertSingleToken(';', TokenType.NEWLINE);
    });

    it('should consume a CRLF new line', () => {
        assertSingleToken('\r\n', TokenType.NEWLINE);
    });

    it('should consume lonely \\r as whitespace', () => {
        assertSingleToken('\r', TokenType.WHITESPACE);
        assertSingleToken('\r \t', TokenType.WHITESPACE);
    });

    it('should consume whitespace', () => {
        assertSingleToken(' ', TokenType.WHITESPACE);
        assertSingleToken('\t', TokenType.WHITESPACE);
        assertSingleToken(' \t \t', TokenType.WHITESPACE);
    });

    it('should register an invalid character as an error', () => {
        assert.throws(() => getTokens('#'), "Invalid character '#' (Line 1, Column 1)");
    });

    it('should always return an EOF token', () => {
        const tokens = getTokens('hello');
        assert.strictEqual(tokens.length, 2);
        assert.deepEqual(tokens[1], new Token(TokenType.EOF, 1, 6, ''));
    });
});
