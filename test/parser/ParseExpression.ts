import { ParseExpressionInstance, ParseSequence, ParseOptions } from '~/parser/ParseExpression';
import { TokenType } from '~/parser/Tokenizer';
import { assert } from 'chai';

describe('ParseExpressionInstance', () => {
    it('should create token type expression', () => {
        const exp = new ParseExpressionInstance(TokenType.IDENT);
        assert.strictEqual(exp.tokenType, TokenType.IDENT);
    });

    it('should create token image expression', () => {
        const exp = new ParseExpressionInstance('token');
        assert.strictEqual(exp.tokenImage, 'token');
    });

    it('should create non-terminal class expression', () => {
        function NonTerminal() {}
        const exp = new ParseExpressionInstance(NonTerminal);
        assert.strictEqual(exp.nonTerminal, NonTerminal);
    });

    it('should create parse sequence expression', () => {
        const sequence: ParseSequence = {};
        const exp = new ParseExpressionInstance(sequence);
        assert.strictEqual(exp.sequence, sequence);
    });

    it('should create choice expression', () => {
        const choice = [TokenType.IDENT, 'token', {}];
        const exp = new ParseExpressionInstance(choice);
        assert.deepEqual(exp.choices, [
            new ParseExpressionInstance(TokenType.IDENT),
            new ParseExpressionInstance('token'),
            new ParseExpressionInstance({}),
        ]);
    });

    it('should set options', () => {
        const options: ParseOptions = {
            repeat: '*',
            optional: true,
            definite: true,
            flatten: true,
            err: 'INVALID_TYPE',
        };
        const exp = new ParseExpressionInstance(TokenType.IDENT, options);
        assert.deepEqual({
            repeat: exp.repeat,
            optional: exp.optional,
            definite: exp.definite,
            flatten: exp.flatten,
            err: exp.err,
        } as ParseOptions, options);
    });

    it('should set separator', () => {
        const exp = new ParseExpressionInstance(TokenType.IDENT, {
            sep: TokenType.COMMA,
            sepOptions: { definite: true },
        });
        assert.deepEqual(exp.sep, new ParseExpressionInstance(TokenType.COMMA, { definite: true }));
    });

    it('should copy instance', () => {
        const opts = {
            repeat: '*',
            optional: true,
            definite: true,
            flatten: true,
            err: 'INVALID_TYPE',
        };
        const exp = new ParseExpressionInstance(new ParseExpressionInstance(TokenType.IDENT, {
            ...(opts as ParseOptions),
            sep: TokenType.COMMA,
            sepOptions: { definite: true },
        }));
        assert.deepEqual<{}>({
            tokenType: exp.tokenType,
            repeat: exp.repeat,
            optional: exp.optional,
            definite: exp.definite,
            flatten: exp.definite,
            err: exp.err,
            sep: exp.sep,
        }, {
            tokenType: TokenType.IDENT,
            ...opts,
            sep: new ParseExpressionInstance(TokenType.COMMA, { definite: true }),
        });
    });
});
