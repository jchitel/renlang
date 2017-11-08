import { assert } from 'chai';

import Parser, { ParserComponentSequentialDef } from '~/parser/Parser';
import CSTNode from '~/syntax/CSTNode';
import { nodeToObject } from './test-utils';


class TestNode extends CSTNode {}

describe('parser control logic', () => {
    describe('sequential expansions', () => {
        it('should parse some basic sequential token definitions', () => {
            const parser = new Parser('if (abc) bcd else xyz');
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'elseToken', type: 'ELSE' },
                { name: 'alternateToken', type: 'IDENT' },
            ];
            const node = parser.accept(defs, TestNode);
            assert.deepEqual(nodeToObject(node), {
                ifToken: 'if',
                openParenToken: '(',
                conditionToken: 'abc',
                closeParenToken: ')',
                consequentToken: 'bcd',
                elseToken: 'else',
                alternateToken: 'xyz',
            });
        });

        it('should parse sequential token definition with optional tokens included', () => {
            const parser = new Parser('if (abc) bcd else xyz');
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'elseToken', type: 'ELSE', optional: true },
                { name: 'alternateToken', type: 'IDENT', optional: true },
            ];
            const node = parser.accept(defs, TestNode);
            assert.deepEqual(nodeToObject(node), {
                ifToken: 'if',
                openParenToken: '(',
                conditionToken: 'abc',
                closeParenToken: ')',
                consequentToken: 'bcd',
                elseToken: 'else',
                alternateToken: 'xyz',
            });
        });

        it('should parse sequential token definition with optional tokens not included', () => {
            let parser = new Parser('if (abc) bcd');
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'elseToken', type: 'ELSE', optional: true },
                { name: 'alternateToken', type: 'IDENT', optional: true },
            ];
            let node = parser.accept(defs, TestNode);
            assert.deepEqual(nodeToObject(node), {
                ifToken: 'if',
                openParenToken: '(',
                conditionToken: 'abc',
                closeParenToken: ')',
                consequentToken: 'bcd',
            });
            // try again with partial inclusion
            parser = new Parser('if (abc) bcd else');
            node = parser.accept(defs, TestNode);
            assert.deepEqual(nodeToObject(node), {
                ifToken: 'if',
                openParenToken: '(',
                conditionToken: 'abc',
                closeParenToken: ')',
                consequentToken: 'bcd',
                elseToken: 'else',
            });
        });

        it('should throw when required token not included and error message not included', () => {
            const parser = new Parser('if');
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'thenToken', image: 'then' },
            ];
            assert.throws(() => parser.accept(defs, TestNode));
        });

        it('should throw error when required token not included and error message included', () => {
            const parser = new Parser('if');
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'thenToken', image: 'then', mess: 'NOT FOUND' },
            ];
            assert.throws(() => parser.accept(defs, TestNode), 'NOT FOUND (Line 1, Column 3)');
        });

        it('should parse sequential definition with sub-parse', () => {
            const parser = new Parser('if (abc) def else xyz');
            const acceptAlternate = (p: Parser) => p.accept([
                { name: 'elseToken', type: 'ELSE', definite: true },
                { name: 'alternateToken', type: 'IDENT' },
            ], TestNode);
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'alternate', parse: acceptAlternate },
            ];
            const node = parser.accept(defs, TestNode);
            assert.deepEqual(nodeToObject(node), {
                ifToken: 'if',
                openParenToken: '(',
                conditionToken: 'abc',
                closeParenToken: ')',
                consequentToken: 'def',
                alternate: {
                    elseToken: 'else',
                    alternateToken: 'xyz',
                },
            });
        });

        it('should parse sequential definition with optional sub-parse', () => {
            const parser = new Parser('if (abc) def else xyz');
            const acceptAlternate = (p: Parser) => p.accept([
                { name: 'elseToken', type: 'ELSE', definite: true },
                { name: 'alternateToken', type: 'IDENT' },
            ], TestNode);
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'alternate', parse: acceptAlternate, optional: true },
            ];
            const node = parser.accept(defs, TestNode);
            assert.deepEqual(nodeToObject(node), {
                ifToken: 'if',
                openParenToken: '(',
                conditionToken: 'abc',
                closeParenToken: ')',
                consequentToken: 'def',
                alternate: {
                    elseToken: 'else',
                    alternateToken: 'xyz',
                },
            });
            assert.strictEqual(parser.tokenizer.peek().type, 'EOF');
        });


        it('should ignore optional not-included sub-parses', () => {
            const parser = new Parser('if (abc) def');
            const acceptAlternate = (p: Parser) => p.accept([
                { name: 'elseToken', type: 'ELSE', definite: true },
                { name: 'alternateToken', type: 'IDENT' },
            ], TestNode);
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'alternate', parse: acceptAlternate, optional: true },
            ];
            const node = parser.accept(defs, TestNode);
            assert.deepEqual(nodeToObject(node), {
                ifToken: 'if',
                openParenToken: '(',
                conditionToken: 'abc',
                closeParenToken: ')',
                consequentToken: 'def',
            });
        });

        it('should ignore a failed parse of an optional non-terminal', () => {
            const parser = new Parser('if (abc) def else 1');
            const acceptAlternate = (p: Parser) => p.accept([
                { name: 'elseToken', type: 'ELSE' },
                { name: 'alternateToken', type: 'IDENT', definite: true },
            ], TestNode);
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'alternate', parse: acceptAlternate, optional: true },
            ];
            const node = parser.accept(defs, TestNode);
            assert.deepEqual(nodeToObject(node), {
                ifToken: 'if',
                openParenToken: '(',
                conditionToken: 'abc',
                closeParenToken: ')',
                consequentToken: 'def',
            });
            assert.strictEqual(parser.tokenizer.peek().image, 'else');
        });
    });

    describe('choice expansions', () => {
        it('should parse from a set of single-token choices', () => {
            const parser = new Parser('abc');
            const choices = [
                { image: 'a' },
                { image: 'ab' },
                { image: 'abc' },
                { image: 'abcd' },
            ];
            const node = parser.acceptOneOf(choices, TestNode);
            assert.deepEqual(nodeToObject(node), {
                choice: 'abc'
            });
        });

        it('should throw for an unmatched token', () => {
            const parser = new Parser('awef');
            const choices = [
                { name: 'aToken', image: 'a' },
                { name: 'abToken', image: 'ab' },
                { name: 'abcToken', image: 'abc' },
                { name: 'abcdToken', image: 'abcd' },
            ];
            assert.throws(() => parser.acceptOneOf(choices, TestNode));
        });

        it('should parse from a set of non-terminal choices', () => {
            const parser = new Parser('a b');
            const choices = [
                { name: 'abcd', parse: (p: Parser) => p.accept([{ name: 'aToken', image: 'a' }, { name: 'bToken', image: 'b' }, { name: 'cToken', image: 'c' }, { name: 'dToken', image: 'd', definite: true }], TestNode) },
                { name: 'abc', parse: (p: Parser) => p.accept([{ name: 'aToken', image: 'a' }, { name: 'bToken', image: 'b' }, { name: 'cToken', image: 'c', definite: true }], TestNode) },
                { name: 'ab', parse: (p: Parser) => p.accept([{ name: 'aToken', image: 'a' }, { name: 'bToken', image: 'b', definite: true }], TestNode) },
                { name: 'a', parse: (p: Parser) => p.accept([{ name: 'aToken', image: 'a', definite: true }], TestNode) },
            ];
            assert.deepEqual(nodeToObject(parser.acceptOneOf(choices, TestNode)), {
                choice: {
                    aToken: 'a',
                    bToken: 'b'
                },
            });
        });
    });

    describe('left-recursive expansions', () => {
        it('should parse from a set of left-recursive choices', () => {
            class MyNode extends CSTNode {}
            const parser = new Parser('a c');
            const bases = [{ image: 'a' }];
            const suffixes = [
                { name: 'b', baseName: 'base', parse: (p: Parser) => p.accept([{ name: 'bToken', image: 'b', definite: true }], TestNode) },
                { name: 'c', baseName: 'base', parse: (p: Parser) => p.accept([{ name: 'cToken', image: 'c', definite: true }], TestNode) },
                { name: 'd', baseName: 'base', parse: (p: Parser) => p.accept([{ name: 'dToken', image: 'd', definite: true }], TestNode) },
            ];
            assert.deepEqual(nodeToObject(parser.acceptLeftRecursive({ bases, suffixes }, MyNode)), {
                choice: {
                    base: { choice: 'a' },
                    cToken: 'c'
                },
            });
        });
    });

    describe('repetitive expansions', () => {
        it('should handle basic zeroOrMore expansion', () => {
            const parser = new Parser('a a a');
            const defs = [{ name: 'aTokens', image: 'a', zeroOrMore: true, definite: true }];
            assert.deepEqual(nodeToObject(parser.accept(defs, TestNode)), {
                aTokens: ['a', 'a', 'a'],
            });
        });

        it('should handle basic oneOrMore expansion', () => {
            const parser = new Parser('a a a');
            const defs = [{ name: 'aTokens', image: 'a', oneOrMore: true, definite: true }];
            assert.deepEqual(nodeToObject(parser.accept(defs, TestNode)), {
                aTokens: ['a', 'a', 'a'],
            });
        });

        it('should throw an error for unsatisfied oneOrMore expansion', () => {
            let parser = new Parser('b');
            let defs: ParserComponentSequentialDef<TestNode>[] = [{ name: 'aTokens', image: 'a', oneOrMore: true, definite: true }];
            assert.throws(() => parser.accept(defs, TestNode));

            parser = new Parser('b');
            defs = [{ name: 'aTokens', image: 'a', oneOrMore: true, definite: true, mess: 'NOT FOUND' }];
            assert.throws(() => parser.accept(defs, TestNode), 'NOT FOUND (Line 1, Column 1)');
        });

        it('should handle repetition with a separator', () => {
            const parser = new Parser('a | a | a');
            const defs = [{ name: 'aTokens', image: 'a', zeroOrMore: true, definite: true, sep: { name: 'bars', image: '|' } }];
            assert.deepEqual(nodeToObject(parser.accept(defs, TestNode)), {
                aTokens: ['a', 'a', 'a'],
                bars: ['|', '|'],
            });
        });

        it('should error when a new item is expected after a separator but there isnt one', () => {
            let parser = new Parser('a | a |');
            let defs: ParserComponentSequentialDef<TestNode>[] = [{ name: 'aTokens', image: 'a', zeroOrMore: true, definite: true, sep: { name: 'bars', image: '|' } }];
            assert.throws(() => parser.accept(defs, TestNode));
            parser = new Parser('a | a |');
            defs = [{ name: 'aTokens', image: 'a', zeroOrMore: true, definite: true, mess: 'NOT FOUND', sep: { name: 'bars', image: '|' } }];
            assert.throws(() => parser.accept(defs, TestNode), 'NOT FOUND (Line 1, Column 8)');
        });
    });
});
