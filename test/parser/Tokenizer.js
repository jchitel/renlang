import { expect } from 'chai';

import Tokenizer, { Token } from '../../src/parser/Tokenizer';


function getTokens(str) {
    return [...new Tokenizer(str)];
}

describe('Tokenizer', () => {
    it('should construct an iterator', () => {
        const tokenizer = new Tokenizer('hello');
        expect(tokenizer.iterator[Symbol.iterator]().next().value).to.eql(['h', 'e', 'l', 'l', 'o']);
    });

    it('should consume an identifier', () => {
        let [token] = getTokens('hello');
        expect(token).to.eql(new Token('IDENT', 0, 'hello'));

        [token] = getTokens('h');
        expect(token).to.eql(new Token('IDENT', 0, 'h'));

        [token] = getTokens('HeLlO');
        expect(token).to.eql(new Token('IDENT', 0, 'HeLlO'));

        [token] = getTokens('_hello');
        expect(token).to.eql(new Token('IDENT', 0, '_hello'));

        [token] = getTokens('h_E_l_L_o');
        expect(token).to.eql(new Token('IDENT', 0, 'h_E_l_L_o'));

        [token] = getTokens('h3110');
        expect(token).to.eql(new Token('IDENT', 0, 'h3110'));
    });

    it('should consume keywords', () => {
        for (const kw of Tokenizer.KEYWORD_TOKENS) {
            const [token] = getTokens(kw);
            expect(token).to.eql(new Token(kw.toUpperCase(), 0, kw));
        }
    })

    it('should consume an integer', () => {
        let [token] = getTokens('1');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 0, '1', 1));

        [token] = getTokens('31415926');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 0, '31415926', 31415926));

        [token] = getTokens('-42');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 0, '-42', -42));

        [token] = getTokens('0');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 0, '0', 0));

        [token] = getTokens('01');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 0, '01', 1));

        [token] = getTokens('-0');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 0, '-0', -0));
    });

    it('should consume a hexadecimal literal', () => {
        let [token] = getTokens('0x1f');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 0, '0x1f', 31));
    })

    it("should handle '0x' case", () => {
        const tokens = getTokens('0x ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 0, '0', 0),
            new Token('IDENT', 1, 'x'),
            new Token('WHITESPACE', 2, ' '),
            new Token('EOF', 3, null),
        ]);
    });

    it('should consume a binary literal', () => {
        let [token] = getTokens('0b11011');
        expect(token).to.eql(new Token('INTEGER_LITERAL', 0, '0b11011', 27));
    })

    it("should handle '0b' case", () => {
        const tokens = getTokens('0b ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 0, '0', 0),
            new Token('IDENT', 1, 'b'),
            new Token('WHITESPACE', 2, ' '),
            new Token('EOF', 3, null),
        ]);
    });

    it('should consume a floating point literal', () => {
        let [token] = getTokens('0.1');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 0, '0.1', 0.1));

        [token] = getTokens('0.12');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 0, '0.12', 0.12));

        [token] = getTokens('0e1');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 0, '0e1', 0));

        [token] = getTokens('0.1e2');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 0, '0.1e2', 10));

        [token] = getTokens('1e12');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 0, '1e12', 1e12));

        [token] = getTokens('123.456');
        expect(token).to.eql(new Token('FLOAT_LITERAL', 0, '123.456', 123.456));
    });

    it("should handle '0.' and '0e' case", () => {
        let tokens = getTokens('0. ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 0, '0', 0),
            new Token('DOT', 1, '.'),
            new Token('WHITESPACE', 2, ' '),
            new Token('EOF', 3, null),
        ]);

        tokens = getTokens('0e ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 0, '0', 0),
            new Token('IDENT', 1, 'e'),
            new Token('WHITESPACE', 2, ' '),
            new Token('EOF', 3, null),
        ]);

        tokens = getTokens('0.1e ');
        expect(tokens).to.eql([
            new Token('FLOAT_LITERAL', 0, '0.1', 0.1),
            new Token('IDENT', 3, 'e'),
            new Token('WHITESPACE', 4, ' '),
            new Token('EOF', 5, null),
        ]);

        tokens = getTokens('123. ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 0, '123', 123),
            new Token('DOT', 3, '.'),
            new Token('WHITESPACE', 4, ' '),
            new Token('EOF', 5, null),
        ]);
    });

    it('should handle 0 followed by an invalid numeric character', () => {
        const tokens = getTokens('0c ');
        expect(tokens).to.eql([
            new Token('INTEGER_LITERAL', 0, '0', 0),
            new Token('IDENT', 1, 'c'),
            new Token('WHITESPACE', 2, ' '),
            new Token('EOF', 3, null),
        ]);
    });

    it('should consume lonely minus as operator', () => {
        let [token] = getTokens('-');
        expect(token).to.eql(new Token('OPER', 0, '-'));

        [token] = getTokens('-+');
        expect(token).to.eql(new Token('OPER', 0, '-+'));
    });

    it('should consume a string literal', () => {
        let [token] = getTokens('""');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '""', ''));

        [token] = getTokens('"hello"');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '"hello"', 'hello'));
    });

    it('should handle simple escape characters in strings', () => {
        let [token] = getTokens('"\\n"');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '"\\n"', '\n'));

        [token] = getTokens('"\\r"');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '"\\r"', '\r'));

        [token] = getTokens('"\\t"');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '"\\t"', '\t'));

        [token] = getTokens('"\\v"');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '"\\v"', '\v'));

        [token] = getTokens('"\\f"');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '"\\f"', '\f'));

        [token] = getTokens('"\\b"');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '"\\b"', '\b'));
    });

    it('should handle ascii escape sequences in strings', () => {
        let [token] = getTokens('"\\x61"');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '"\\x61"', 'a'));

        [token] = getTokens('"\\xn1"');
        expect(token).to.eql(new Token('STRING_LITERAL', 0, '"\\xn1"', 'xn1'));
    });

    it('should throw an error for unterminated string', () => {
        try {
            getTokens('"');
        } catch (err) {
            expect(err.message).to.eql('Unterminated string at line 1, column 1.');
        }

        try {
            getTokens('"abcd');
        } catch (err) {
            expect(err.message).to.eql('Unterminated string at line 1, column 5.');
        }
    })

    it('should consume a character literal', () => {
        let [token] = getTokens("'a'");
        expect(token).to.eql(new Token('CHARACTER_LITERAL', 0, "'a'", 'a'));
    });

    it('should throw an error for invalid character literal', () => {
        try {
            getTokens("'");
        } catch (err) {
            expect(err.message).to.eql('Unterminated character at line 1, column 1.');
        }

        try {
            getTokens("'a");
        } catch (err) {
            expect(err.message).to.eql('Unterminated character at line 1, column 2.');
        }

        try {
            getTokens("''");
        } catch (err) {
            expect(err.message).to.eql('Empty character at line 1, column 1.');
        }
    });

    it('should consume a non-equals symbol', () => {
        let [token] = getTokens(':');
        expect(token).to.eql(new Token('COLON', 0, ':'));

        [token] = getTokens('{');
        expect(token).to.eql(new Token('LBRACE', 0, '{'));

        [token] = getTokens('}');
        expect(token).to.eql(new Token('RBRACE', 0, '}'));

        [token] = getTokens('(');
        expect(token).to.eql(new Token('LPAREN', 0, '('));

        [token] = getTokens(')');
        expect(token).to.eql(new Token('RPAREN', 0, ')'));

        [token] = getTokens('[');
        expect(token).to.eql(new Token('LBRACK', 0, '['));

        [token] = getTokens(']');
        expect(token).to.eql(new Token('RBRACK', 0, ']'));

        [token] = getTokens(',');
        expect(token).to.eql(new Token('COMMA', 0, ','));

        [token] = getTokens('`');
        expect(token).to.eql(new Token('BACKTICK', 0, '`'));

        [token] = getTokens('.');
        expect(token).to.eql(new Token('DOT', 0, '.'));
    });

    it('should consume a symbol starting with an equals', () => {
        let [token] = getTokens('=>');
        expect(token).to.eql(new Token('FAT_ARROW', 0, '=>'));

        [token] = getTokens('=');
        expect(token).to.eql(new Token('EQUALS', 0, '='));
    });

    it('should consume an operator starting with equals', () => {
        let [token] = getTokens('=+');
        expect(token).to.eql(new Token('OPER', 0, '=+'));
    });

    it('should consume an operator', () => {
        for (const c of Tokenizer.OPER_CHARS) {
            if (c === '=') continue; // lonely equals is a special case
            const [token] = getTokens(c);
            expect(token).to.eql(new Token('OPER', 0, c));
        }
        let [token] = getTokens('~!$%^&+=-|</');
        expect(token).to.eql(new Token('OPER', 0, '~!$%^&+=-|</'));
    });

    it('should consume a new line token', () => {
        let [token] = getTokens('\n');
        expect(token).to.eql(new Token('NEWLINE', 0, '\n'));

        [token] = getTokens(';');
        expect(token).to.eql(new Token('NEWLINE', 0, ';'));
    });

    it('should consume a CRLF new line', () => {
        const [token] = getTokens('\r\n');
        expect(token).to.eql(new Token('NEWLINE', 0, '\r\n'));
    });

    it('should consume lonely \\r as whitespace', () => {
        let [token] = getTokens('\r');
        expect(token).to.eql(new Token('WHITESPACE', 0, '\r'));

        [token] = getTokens('\r \t');
        expect(token).to.eql(new Token('WHITESPACE', 0, '\r \t'));
    });

    it('should consume whitespace', () => {
        let [token] = getTokens(' ');
        expect(token).to.eql(new Token('WHITESPACE', 0, ' '));

        [token] = getTokens('\t');
        expect(token).to.eql(new Token('WHITESPACE', 0, '\t'));

        [token] = getTokens(' \t \t');
        expect(token).to.eql(new Token('WHITESPACE', 0, ' \t \t'));
    });

    it('should register an invalid character as an error', () => {
        try {
            getTokens('#');
        } catch (err) {
            expect(err.message).to.eql("Invalid character '#' at line 1, column 1.");
        }
    });

    it('should always return an EOF token', () => {
        const tokens = getTokens('hello');
        expect(tokens.length).to.eql(2);
        expect(tokens[1]).to.eql(new Token('EOF', 5, null));
    });
});
