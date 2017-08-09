import { expect } from 'chai';

import Tokenizer, { Token } from '../../src/parser/Tokenizer';


function getTokens(str, flipIgnore = false) {
    if (!flipIgnore) return [...new Tokenizer(str)];
    const tokenizer = new Tokenizer(str);
    tokenizer.ignoreMode = false;
    return [...tokenizer];
}

describe('Tokenizer', () => {
    it('should construct an iterator', () => {
        const tokenizer = new Tokenizer('hello');
        expect(tokenizer.iterator[Symbol.iterator]().next().value).to.eql('h');
    });

    it('should consume a single-line comment', () => {
        let [token] = getTokens('// this is a comment', true);
        expect(token).to.eql(new Token('COMMENT', 1, 1, '// this is a comment'));

        [token] = getTokens('// this is a comment\n', true);
        expect(token).to.eql(new Token('COMMENT', 1, 1, '// this is a comment\n'));
    });

    it('should consume a multi-line comment', () => {
        let [token] = getTokens('/* this is a comment */', true);
        expect(token).to.eql(new Token('COMMENT', 1, 1, '/* this is a comment */'));

        [token] = getTokens('/* this is a comment', true);
        expect(token).to.eql(new Token('COMMENT', 1, 1, '/* this is a comment'));

        [token] = getTokens('/* this is a comment\nand another line */', true);
        expect(token).to.eql(new Token('COMMENT', 1, 1, '/* this is a comment\nand another line */'));
    });

    it('should consume an identifier', () => {
        let [token] = getTokens('hello');
        expect(token).to.eql(new Token('IDENT', 1, 1, 'hello'));

        [token] = getTokens('h');
        expect(token).to.eql(new Token('IDENT', 1, 1, 'h'));

        [token] = getTokens('HeLlO');
        expect(token).to.eql(new Token('IDENT', 1, 1, 'HeLlO'));

        [token] = getTokens('_hello');
        expect(token).to.eql(new Token('IDENT', 1, 1, '_hello'));

        [token] = getTokens('h_E_l_L_o');
        expect(token).to.eql(new Token('IDENT', 1, 1, 'h_E_l_L_o'));

        [token] = getTokens('h3110');
        expect(token).to.eql(new Token('IDENT', 1, 1, 'h3110'));
    });

    it('should consume keywords', () => {
        for (const kw of Tokenizer.KEYWORD_TOKENS) {
            const [token] = getTokens(kw);
            expect(token).to.eql(new Token(kw.toUpperCase(), 1, 1, kw));
        }
    });

    it('should consume an integer', () => {
        let [token] = getTokens('1');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 1, 1, '1', 1));

        [token] = getTokens('31415926');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 1, 1, '31415926', 31415926));

        [token] = getTokens('-42');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 1, 1, '-42', -42));

        [token] = getTokens('0');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 1, 1, '0', 0));

        [token] = getTokens('01');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 1, 1, '01', 1));

        [token] = getTokens('-0');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 1, 1, '-0', -0));
    });

    it('should consume a hexadecimal literal', () => {
        const [token] = getTokens('0x1f');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 1, 1, '0x1f', 31));
    });

    it("should handle '0x' case", () => {
        const tokens = getTokens('0x ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('IDENT', 1, 2, 'x'),
            new Token('EOF', 1, 4, null),
        ]);
    });

    it('should consume a binary literal', () => {
        const [token] = getTokens('0b11011');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 1, 1, '0b11011', 27));
    });

    it("should handle '0b' case", () => {
        const tokens = getTokens('0b ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('IDENT', 1, 2, 'b'),
            new Token('EOF', 1, 4, null),
        ]);
    });

    it('should consume a floating point literal', () => {
        let [token] = getTokens('0.1');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 1, 1, '0.1', 0.1));

        [token] = getTokens('0.12');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 1, 1, '0.12', 0.12));

        [token] = getTokens('0e1');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 1, 1, '0e1', 0));

        [token] = getTokens('0.1e2');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 1, 1, '0.1e2', 10));

        [token] = getTokens('1e12');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 1, 1, '1e12', 1e12));

        [token] = getTokens('123.456');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 1, 1, '123.456', 123.456));
    });

    it("should handle '0.' and '0e' case", () => {
        let tokens = getTokens('0. ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('DOT', 1, 2, '.'),
            new Token('EOF', 1, 4, null),
        ]);

        tokens = getTokens('0e ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('IDENT', 1, 2, 'e'),
            new Token('EOF', 1, 4, null),
        ]);

        tokens = getTokens('0.1e ');
        expect(tokens).to.eql([
            new Token('FLOAT_LITERAL', 1, 1, '0.1', 0.1),
            new Token('IDENT', 1, 4, 'e'),
            new Token('EOF', 1, 6, null),
        ]);

        tokens = getTokens('123. ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 1, 1, '123', 123),
            new Token('DOT', 1, 4, '.'),
            new Token('EOF', 1, 6, null),
        ]);
    });

    it('should handle 0 followed by an invalid numeric character', () => {
        const tokens = getTokens('0c ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 1, 1, '0', 0),
            new Token('IDENT', 1, 2, 'c'),
            new Token('EOF', 1, 4, null),
        ]);
    });

    it('should consume lonely minus as operator', () => {
        let [token] = getTokens('-');
        expect(token).to.eql(new Token('OPER', 1, 1, '-'));

        [token] = getTokens('-+');
        expect(token).to.eql(new Token('OPER', 1, 1, '-+'));
    });

    it('should consume a string literal', () => {
        let [token] = getTokens('""');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '""', ''));

        [token] = getTokens('"hello"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"hello"', 'hello'));
    });

    it('should handle simple escape characters in strings', () => {
        let [token] = getTokens('"\\n"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\n"', '\n'));

        [token] = getTokens('"\\r"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\r"', '\r'));

        [token] = getTokens('"\\t"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\t"', '\t'));

        [token] = getTokens('"\\v"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\v"', '\v'));

        [token] = getTokens('"\\f"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\f"', '\f'));

        [token] = getTokens('"\\b"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\b"', '\b'));

        [token] = getTokens('"\\a"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\a"', 'a'));
    });

    it('should handle ascii escape sequences in strings', () => {
        let [token] = getTokens('"\\x61"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\x61"', 'a'));

        [token] = getTokens('"\\xn1"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\xn1"', 'xn1'));
    });

    it('should handle unicode escape sequences in strings', () => {
        let [token] = getTokens('"\\u0061"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\u0061"', 'a'));

        [token] = getTokens('"\\u{00061}"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\u{00061}"', 'a'));

        [token] = getTokens('"\\u{000061}"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\u{000061}"', 'a'));

        [token] = getTokens('"\\u00n1"');
        expect(token).to.eql(new Token('STRING_LITERAL', 1, 1, '"\\u00n1"', 'u00n1'));
    });

    it('should throw an error for unterminated string', () => {
        try {
            getTokens('"');
        } catch (err) {
            expect(err.message).to.eql('Unterminated string (Line 1, Column 1)');
        }

        try {
            getTokens('"abcd');
        } catch (err) {
            expect(err.message).to.eql('Unterminated string (Line 1, Column 5)');
        }
    });

    it('should consume a character literal', () => {
        const [token] = getTokens("'a'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'a'", 'a'));
    });

    it('should handle simple escape characters in characters', () => {
        let [token] = getTokens("'\\n'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\n'", '\n'));

        [token] = getTokens("'\\r'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\r'", '\r'));

        [token] = getTokens("'\\t'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\t'", '\t'));

        [token] = getTokens("'\\v'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\v'", '\v'));

        [token] = getTokens("'\\f'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\f'", '\f'));

        [token] = getTokens("'\\b'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\b'", '\b'));

        [token] = getTokens("'\\a'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\a'", 'a'));
    });

    it('should handle ascii escape sequences in characters', () => {
        const [token] = getTokens("'\\x61'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\x61'", 'a'));

        try {
            getTokens("'\\xn1'");
        } catch (err) {
            expect(err.message).to.eql('Unterminated character (Line 1, Column 6)');
        }
    });

    it('should handle unicode escape sequences in characters', () => {
        let [token] = getTokens("'\\u0061'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\u0061'", 'a'));

        [token] = getTokens("'\\u{00061}'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\u{00061}'", 'a'));

        [token] = getTokens("'\\u{000061}'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 1, 1, "'\\u{000061}'", 'a'));

        try {
            getTokens("'\\u00n1'");
        } catch (err) {
            expect(err.message).to.eql('Unterminated character (Line 1, Column 8)');
        }
    });

    it('should throw an error for invalid character literal', () => {
        try {
            getTokens("'");
        } catch (err) {
            expect(err.message).to.eql('Unterminated character (Line 1, Column 1)');
        }

        try {
            getTokens("'a");
        } catch (err) {
            expect(err.message).to.eql('Unterminated character (Line 1, Column 2)');
        }

        try {
            getTokens("''");
        } catch (err) {
            expect(err.message).to.eql('Empty character (Line 1, Column 2)');
        }
    });

    it('should consume a non-equals symbol', () => {
        let [token] = getTokens(':');
        expect(token).to.eql(new Token('COLON', 1, 1, ':'));

        [token] = getTokens('{');
        expect(token).to.eql(new Token('LBRACE', 1, 1, '{'));

        [token] = getTokens('}');
        expect(token).to.eql(new Token('RBRACE', 1, 1, '}'));

        [token] = getTokens('(');
        expect(token).to.eql(new Token('LPAREN', 1, 1, '('));

        [token] = getTokens(')');
        expect(token).to.eql(new Token('RPAREN', 1, 1, ')'));

        [token] = getTokens('[');
        expect(token).to.eql(new Token('LBRACK', 1, 1, '['));

        [token] = getTokens(']');
        expect(token).to.eql(new Token('RBRACK', 1, 1, ']'));

        [token] = getTokens(',');
        expect(token).to.eql(new Token('COMMA', 1, 1, ','));

        [token] = getTokens('`');
        expect(token).to.eql(new Token('BACKTICK', 1, 1, '`'));

        [token] = getTokens('.');
        expect(token).to.eql(new Token('DOT', 1, 1, '.'));
    });

    it('should consume a symbol starting with an equals', () => {
        let [token] = getTokens('=>');
        expect(token).to.eql(new Token('FAT_ARROW', 1, 1, '=>'));

        [token] = getTokens('=');
        expect(token).to.eql(new Token('EQUALS', 1, 1, '='));
    });

    it('should consume an operator starting with equals', () => {
        const [token] = getTokens('=+');
        expect(token).to.eql(new Token('OPER', 1, 1, '=+'));
    });

    it('should consume an operator', () => {
        for (const c of Tokenizer.OPER_CHARS) {
            if (c === '=') continue; // lonely equals is a special case
            const [token] = getTokens(c);
            expect(token).to.eql(new Token('OPER', 1, 1, c));
        }
        const [token] = getTokens('~!$%^&+=-|</');
        expect(token).to.eql(new Token('OPER', 1, 1, '~!$%^&+=-|</'));
    });

    it('should consume a new line token', () => {
        let [token] = getTokens('\n', true);
        expect(token).to.eql(new Token('NEWLINE', 1, 1, '\n'));

        [token] = getTokens(';', true);
        expect(token).to.eql(new Token('NEWLINE', 1, 1, ';'));
    });

    it('should consume a CRLF new line', () => {
        const [token] = getTokens('\r\n', true);
        expect(token).to.eql(new Token('NEWLINE', 1, 1, '\r\n'));
    });

    it('should consume lonely \\r as whitespace', () => {
        let [token] = getTokens('\r', true);
        expect(token).to.eql(new Token('WHITESPACE', 1, 1, '\r'));

        [token] = getTokens('\r \t', true);
        expect(token).to.eql(new Token('WHITESPACE', 1, 1, '\r \t'));
    });

    it('should consume whitespace', () => {
        let [token] = getTokens(' ', true);
        expect(token).to.eql(new Token('WHITESPACE', 1, 1, ' '));

        [token] = getTokens('\t', true);
        expect(token).to.eql(new Token('WHITESPACE', 1, 1, '\t'));

        [token] = getTokens(' \t \t', true);
        expect(token).to.eql(new Token('WHITESPACE', 1, 1, ' \t \t'));
    });

    it('should register an invalid character as an error', () => {
        try {
            getTokens('#');
        } catch (err) {
            expect(err.message).to.eql("Invalid character '#' (Line 1, Column 1)");
        }
    });

    it('should always return an EOF token', () => {
        const tokens = getTokens('hello');
        expect(tokens.length).to.eql(2);
        expect(tokens[1]).to.eql(new Token('EOF', 1, 6, null));
    });
});
