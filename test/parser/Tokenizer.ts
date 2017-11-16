import { assert } from 'chai';

import Tokenizer, { Token } from '~/parser/Tokenizer';


function getTokens(str: string, flipIgnore = false) {
    if (!flipIgnore) return [...new Tokenizer(str)];
    const tokenizer = new Tokenizer(str);
    tokenizer.ignoreMode = false;
    return [...tokenizer];
}

function assertSingleToken(str: string, type: string, value?: any) {
    const [token] = getTokens(str, true);
    assert.deepEqual(token, new Token(type, 1, 1, str, value));
}

describe('Tokenizer', () => {
    it('should construct a lazy list', () => {
        const tokenizer = new Tokenizer('hello');
        assert.strictEqual(tokenizer.list.peek(), 'h');
    });

    it('should consume a single-line comment', () => {
        assertSingleToken('// this is a comment', 'COMMENT');
        assertSingleToken('//this is a comment\n', 'COMMENT');
    });

    it('should consume a multi-line comment', () => {
        assertSingleToken('/* this is a comment */', 'COMMENT');
        assertSingleToken('/* this is a comment', 'COMMENT');
        assertSingleToken('/* this is a comment\nand another line */', 'COMMENT');
    });

    it('should consume an identifier', () => {
        assertSingleToken('hello', 'IDENT');
        assertSingleToken('h', 'IDENT');
        assertSingleToken('HeLl0', 'IDENT');
        assertSingleToken('_hello', 'IDENT');
        assertSingleToken('h_E_l_L_o', 'IDENT');
        assertSingleToken('h3110', 'IDENT');
    });

    it('should consume keywords', () => {
        for (const kw of Tokenizer.KEYWORD_TOKENS) assertSingleToken(kw, kw.toUpperCase());
    });

    it('should consume an integer', () => {
        assertSingleToken('1', 'INTEGER_LITERAL', 1);
        assertSingleToken('31415926', 'INTEGER_LITERAL', 31415926);
        assertSingleToken('-42', 'INTEGER_LITERAL', -42);
        assertSingleToken('0', 'INTEGER_LITERAL', 0);
        assertSingleToken('01', 'INTEGER_LITERAL', 1);
        assertSingleToken('-0', 'INTEGER_LITERAL', -0);
    });

    it('should consume a hexadecimal literal', () => {
        assertSingleToken('0x1f', 'INTEGER_LITERAL', 31);
    });

    it("should handle '0x' case", () => {
        const tokens = getTokens('0x ');
        assert.deepEqual(tokens, [
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('IDENT', 1, 2, 'x'),
            new Token('EOF', 1, 4, ''),
        ]);
    });

    it('should consume a binary literal', () => {
        assertSingleToken('0b11011', 'INTEGER_LITERAL', 27);
    });

    it("should handle '0b' case", () => {
        const tokens = getTokens('0b ');
        assert.deepEqual(tokens, [
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('IDENT', 1, 2, 'b'),
            new Token('EOF', 1, 4, ''),
        ]);
    });

    it('should consume a floating point literal', () => {
        assertSingleToken('0.1', 'FLOAT_LITERAL', 0.1);
        assertSingleToken('0.12', 'FLOAT_LITERAL', 0.12);
        assertSingleToken('0e1', 'FLOAT_LITERAL', 0);
        assertSingleToken('0.1e2', 'FLOAT_LITERAL', 10);
        assertSingleToken('1e12', 'FLOAT_LITERAL', 1e12);
        assertSingleToken('123.456', 'FLOAT_LITERAL', 123.456);
    });

    it("should handle '0.' and '0e' case", () => {
        let tokens = getTokens('0. ');
        assert.deepEqual(tokens, [
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('DOT', 1, 2, '.'),
            new Token('EOF', 1, 4, ''),
        ]);

        tokens = getTokens('0e ');
        assert.deepEqual(tokens, [
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('IDENT', 1, 2, 'e'),
            new Token('EOF', 1, 4, ''),
        ]);

        tokens = getTokens('0.1e ');
        assert.deepEqual(tokens, [
            new Token('FLOAT_LITERAL', 1, 1, '0.1', 0.1),
            new Token('IDENT', 1, 4, 'e'),
            new Token('EOF', 1, 6, ''),
        ]);

        tokens = getTokens('123. ');
        assert.deepEqual(tokens, [
            new Token('INTEGER_LITERAL', 1, 1, '123', 123),
            new Token('DOT', 1, 4, '.'),
            new Token('EOF', 1, 6, ''),
        ]);
    });

    it('should handle 0 followed by an invalid numeric character', () => {
        const tokens = getTokens('0c ');
        assert.deepEqual(tokens, [
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('IDENT', 1, 2, 'c'),
            new Token('EOF', 1, 4, ''),
        ]);
    });

    it('should consume lonely minus as operator', () => {
        assertSingleToken('-', 'OPER');
        assertSingleToken('-+', 'OPER');
    });

    it('should consume a string literal', () => {
        assertSingleToken('""', 'STRING_LITERAL', '');
        assertSingleToken('"hello"', 'STRING_LITERAL', 'hello');
    });

    it('should handle simple escape characters in strings', () => {
        assertSingleToken('"\\n"', 'STRING_LITERAL', '\n');
        assertSingleToken('"\\r"', 'STRING_LITERAL', '\r');
        assertSingleToken('"\\t"', 'STRING_LITERAL', '\t');
        assertSingleToken('"\\v"', 'STRING_LITERAL', '\v');
        assertSingleToken('"\\f"', 'STRING_LITERAL', '\f');
        assertSingleToken('"\\b"', 'STRING_LITERAL', '\b');
        assertSingleToken('"\\a"', 'STRING_LITERAL', 'a');
    });

    it('should handle ascii escape sequences in strings', () => {
        assertSingleToken('"\\x61"', 'STRING_LITERAL', 'a');
        assertSingleToken('"\\xn1"', 'STRING_LITERAL', 'xn1');
    });

    it('should handle unicode escape sequences in strings', () => {
        assertSingleToken('"\\u0061"', 'STRING_LITERAL', 'a');
        assertSingleToken('"\\u{00061}"', 'STRING_LITERAL', 'a');
        assertSingleToken('"\\u{000061}"', 'STRING_LITERAL', 'a');
        assertSingleToken('"\\u00n1"', 'STRING_LITERAL', 'u00n1');
    });

    it('should throw an error for unterminated string', () => {
        assert.throws(() => getTokens('"'), 'Unterminated string (Line 1, Column 1)');
        assert.throws(() => getTokens('"abcd'), 'Unterminated string (Line 1, Column 5)');
    });

    it('should consume a character literal', () => {
        assertSingleToken("'a'", 'CHARACTER_LITERAL', 'a');
    });

    it('should handle simple escape characters in characters', () => {
        assertSingleToken("'\\n'", 'CHARACTER_LITERAL', '\n');
        assertSingleToken("'\\r'", 'CHARACTER_LITERAL', '\r');
        assertSingleToken("'\\t'", 'CHARACTER_LITERAL', '\t');
        assertSingleToken("'\\v'", 'CHARACTER_LITERAL', '\v');
        assertSingleToken("'\\f'", 'CHARACTER_LITERAL', '\f');
        assertSingleToken("'\\b'", 'CHARACTER_LITERAL', '\b');
        assertSingleToken("'\\a'", 'CHARACTER_LITERAL', 'a');
    });

    it('should handle ascii escape sequences in characters', () => {
        assertSingleToken("'\\x61'", 'CHARACTER_LITERAL', 'a');
        assert.throws(() => getTokens("'\\xn1'"), 'Unterminated character (Line 1, Column 6)');
    });

    it('should handle unicode escape sequences in characters', () => {
        assertSingleToken("'\\u0061'", 'CHARACTER_LITERAL', 'a');
        assertSingleToken("'\\u{00061}'", 'CHARACTER_LITERAL', 'a');
        assertSingleToken("'\\u{000061}'", 'CHARACTER_LITERAL', 'a');
        assert.throws(() => getTokens("'\\u00n1'"), 'Unterminated character (Line 1, Column 8)');
    });

    it('should throw an error for invalid character literal', () => {
        assert.throws(() => getTokens("'"), 'Unterminated character (Line 1, Column 1)');
        assert.throws(() => getTokens("'a"), 'Unterminated character (Line 1, Column 2)');
        assert.throws(() => getTokens("''"), 'Empty character (Line 1, Column 2)');
    });

    it('should consume a non-equals symbol', () => {
        assertSingleToken(':', 'COLON');
        assertSingleToken('{', 'LBRACE');
        assertSingleToken('}', 'RBRACE');
        assertSingleToken('(', 'LPAREN');
        assertSingleToken(')', 'RPAREN');
        assertSingleToken('[', 'LBRACK');
        assertSingleToken(']', 'RBRACK');
        assertSingleToken(':', 'COLON');
        assertSingleToken(',', 'COMMA');
        assertSingleToken('`', 'BACKTICK');
        assertSingleToken('.', 'DOT');
    });

    it('should consume a symbol starting with an equals', () => {
        assertSingleToken('=>', 'FAT_ARROW');
        assertSingleToken('=', 'EQUALS');
    });

    it('should consume an operator starting with equals', () => {
        assertSingleToken('=+', 'OPER');
    });

    it('should consume an operator', () => {
        for (const c of Tokenizer.OPER_CHARS) {
            if (c === '=') continue; // lonely equals is a special case
            assertSingleToken(c, 'OPER');
        }
        assertSingleToken('~!$%^&+=-|</', 'OPER');
    });

    it('should consume a new line token', () => {
        assertSingleToken('\n', 'NEWLINE');
        assertSingleToken(';', 'NEWLINE');
    });

    it('should consume a CRLF new line', () => {
        assertSingleToken('\r\n', 'NEWLINE');
    });

    it('should consume lonely \\r as whitespace', () => {
        assertSingleToken('\r', 'WHITESPACE');
        assertSingleToken('\r \t', 'WHITESPACE');
    });

    it('should consume whitespace', () => {
        assertSingleToken(' ', 'WHITESPACE');
        assertSingleToken('\t', 'WHITESPACE');
        assertSingleToken(' \t \t', 'WHITESPACE');
    });

    it('should register an invalid character as an error', () => {
        assert.throws(() => getTokens('#'), "Invalid character '#' (Line 1, Column 1)");
    });

    it('should always return an EOF token', () => {
        const tokens = getTokens('hello');
        assert.strictEqual(tokens.length, 2);
        assert.deepEqual(tokens[1], new Token('EOF', 1, 6, ''));
    });
});
