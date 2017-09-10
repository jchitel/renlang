import { expect } from 'chai';

import { Parser } from '../../src/parser/parser-control';
import ASTNode from '../../src/ast/ASTNode';


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
            const node = parser.accept(defs, ASTNode);
            expect(node.toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IF', image: 'if' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'IDENT', image: 'abc' },
                    { type: 'RPAREN', image: ')' },
                    { type: 'IDENT', image: 'bcd' },
                    { type: 'ELSE', image: 'else' },
                    { type: 'IDENT', image: 'xyz' },
                ],
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
            const node = parser.accept(defs, ASTNode);
            expect(node.toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IF', image: 'if' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'IDENT', image: 'abc' },
                    { type: 'RPAREN', image: ')' },
                    { type: 'IDENT', image: 'bcd' },
                    { type: 'ELSE', image: 'else' },
                    { type: 'IDENT', image: 'xyz' },
                ],
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
            let node = parser.accept(defs, ASTNode);
            expect(node.toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IF', image: 'if' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'IDENT', image: 'abc' },
                    { type: 'RPAREN', image: ')' },
                    { type: 'IDENT', image: 'bcd' },
                ],
            });
            // try again with partial inclusion
            parser = new Parser('if (abc) bcd else');
            node = parser.accept(defs, ASTNode);
            expect(node.toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IF', image: 'if' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'IDENT', image: 'abc' },
                    { type: 'RPAREN', image: ')' },
                    { type: 'IDENT', image: 'bcd' },
                    { type: 'ELSE', image: 'else' },
                ],
            });
        });

        it('should return false when required token not included and error message not included', () => {
            const parser = new Parser('if');
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'thenToken', image: 'then' },
            ];
            const node = parser.accept(defs, ASTNode);
            expect(node).to.eql(false);
        });

        it('should throw error when required token not included and error message included', () => {
            const parser = new Parser('if');
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'thenToken', image: 'then', mess: 'NOT FOUND' },
            ];
            expect(() => parser.accept(defs, ASTNode)).to.throw('NOT FOUND (Line 1, Column 3)');
        });

        it('should parse sequential definition with sub-parse', () => {
            const parser = new Parser('if (abc) def else xyz');
            const acceptAlternate = p => p.accept([
                { name: 'elseToken', type: 'ELSE', definite: true },
                { name: 'alternateToken', type: 'IDENT' },
            ], ASTNode);
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'alternate', parse: acceptAlternate },
            ];
            const node = parser.accept(defs, ASTNode);
            expect(node.toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IF', image: 'if' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'IDENT', image: 'abc' },
                    { type: 'RPAREN', image: ')' },
                    { type: 'IDENT', image: 'def' },
                    {
                        type: 'ASTNode',
                        children: [
                            { type: 'ELSE', image: 'else' },
                            { type: 'IDENT', image: 'xyz' },
                        ],
                    },
                ],
            });
        });

        it('should parse sequential definition with optional sub-parse', () => {
            const parser = new Parser('if (abc) def else xyz');
            const acceptAlternate = p => p.accept([
                { name: 'elseToken', type: 'ELSE', definite: true },
                { name: 'alternateToken', type: 'IDENT' },
            ], ASTNode);
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'alternate', parse: acceptAlternate, optional: true },
            ];
            const node = parser.accept(defs, ASTNode);
            expect(node.toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IF', image: 'if' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'IDENT', image: 'abc' },
                    { type: 'RPAREN', image: ')' },
                    { type: 'IDENT', image: 'def' },
                    {
                        type: 'ASTNode',
                        children: [
                            { type: 'ELSE', image: 'else' },
                            { type: 'IDENT', image: 'xyz' },
                        ],
                    },
                ],
            });
            expect(parser.tokenizer.peek().type).to.eql('EOF');
        });


        it('should ignore optional not-included sub-parses', () => {
            const parser = new Parser('if (abc) def');
            const acceptAlternate = p => p.accept([
                { name: 'elseToken', type: 'ELSE', definite: true },
                { name: 'alternateToken', type: 'IDENT' },
            ], ASTNode);
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'alternate', parse: acceptAlternate, optional: true },
            ];
            const node = parser.accept(defs, ASTNode);
            expect(node.toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IF', image: 'if' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'IDENT', image: 'abc' },
                    { type: 'RPAREN', image: ')' },
                    { type: 'IDENT', image: 'def' },
                ],
            });
        });

        it('should ignore a failed parse of an optional non-terminal', () => {
            const parser = new Parser('if (abc) def else 1');
            const acceptAlternate = p => p.accept([
                { name: 'elseToken', type: 'ELSE' },
                { name: 'alternateToken', type: 'IDENT', definite: true },
            ], ASTNode);
            const defs = [
                { name: 'ifToken', type: 'IF', definite: true },
                { name: 'openParenToken', type: 'LPAREN' },
                { name: 'conditionToken', type: 'IDENT' },
                { name: 'closeParenToken', type: 'RPAREN' },
                { name: 'consequentToken', type: 'IDENT' },
                { name: 'alternate', parse: acceptAlternate, optional: true },
            ];
            const node = parser.accept(defs, ASTNode);
            expect(node.toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IF', image: 'if' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'IDENT', image: 'abc' },
                    { type: 'RPAREN', image: ')' },
                    { type: 'IDENT', image: 'def' },
                ],
            });
            expect(parser.tokenizer.peek().image).to.eql('else');
        });
    });

    describe('choice expansions', () => {
        it('should parse from a set of single-token choices', () => {
            const parser = new Parser('abc');
            const choices = [
                { name: 'aToken', image: 'a' },
                { name: 'abToken', image: 'ab' },
                { name: 'abcToken', image: 'abc' },
                { name: 'abcdToken', image: 'abcd' },
            ];
            const node = parser.accept([{ choices }], ASTNode);
            expect(node.toTree()).to.eql({
                type: 'ASTNode',
                children: [{ type: 'IDENT', image: 'abc' }],
            });
        });

        it('should return false for an unmatched token', () => {
            const parser = new Parser('awef');
            const choices = [
                { name: 'aToken', image: 'a' },
                { name: 'abToken', image: 'ab' },
                { name: 'abcToken', image: 'abc' },
                { name: 'abcdToken', image: 'abcd' },
            ];
            expect(parser.accept([{ choices }], ASTNode)).to.eql(false);
        });

        it('should parse from a set of non-terminal choices', () => {
            const parser = new Parser('a b');
            const choices = [
                { name: 'abcd', parse: p => p.accept([{ name: 'aToken', image: 'a' }, { name: 'bToken', image: 'b' }, { name: 'cToken', image: 'c' }, { name: 'dToken', image: 'd', definite: true }], ASTNode) },
                { name: 'abc', parse: p => p.accept([{ name: 'aToken', image: 'a' }, { name: 'bToken', image: 'b' }, { name: 'cToken', image: 'c', definite: true }], ASTNode) },
                { name: 'ab', parse: p => p.accept([{ name: 'aToken', image: 'a' }, { name: 'bToken', image: 'b', definite: true }], ASTNode) },
                { name: 'a', parse: p => p.accept([{ name: 'aToken', image: 'a', definite: true }], ASTNode) },
            ];
            expect(parser.accept([{ choices }], ASTNode).toTree()).to.eql({
                type: 'ASTNode',
                children: [{
                    type: 'ASTNode',
                    children: [
                        { type: 'IDENT', image: 'a' },
                        { type: 'IDENT', image: 'b' },
                    ],
                }],
            });
        });
    });

    describe('left-recursive expansions', () => {
        it('should parse from a set of left-recursive choices', () => {
            class MyNode extends ASTNode {}
            const parser = new Parser('a c');
            const bases = [{ name: 'aToken', image: 'a' }];
            const suffixes = [
                { name: 'b', baseName: 'base', parse: p => p.accept([{ name: 'bToken', image: 'b', definite: true }], ASTNode) },
                { name: 'c', baseName: 'base', parse: p => p.accept([{ name: 'cToken', image: 'c', definite: true }], ASTNode) },
                { name: 'd', baseName: 'base', parse: p => p.accept([{ name: 'dToken', image: 'd', definite: true }], ASTNode) },
            ];
            expect(parser.accept([{ leftRecursive: { bases, suffixes } }], MyNode).toTree()).to.eql({
                type: 'MyNode',
                children: [{
                    type: 'ASTNode',
                    children: [
                        { type: 'MyNode', children: [{ type: 'IDENT', image: 'a' }] },
                        { type: 'IDENT', image: 'c' },
                    ],
                }],
            });
        });
    });

    describe('repetitive expansions', () => {
        it('should handle basic zeroOrMore expansion', () => {
            const parser = new Parser('a a a');
            const defs = [{ name: 'aTokens', image: 'a', zeroOrMore: true, definite: true }];
            expect(parser.accept(defs, ASTNode).toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IDENT', image: 'a' },
                    { type: 'IDENT', image: 'a' },
                    { type: 'IDENT', image: 'a' },
                ],
            });
        });

        it('should handle basic oneOrMore expansion', () => {
            const parser = new Parser('a a a');
            const defs = [{ name: 'aTokens', image: 'a', oneOrMore: true, definite: true }];
            expect(parser.accept(defs, ASTNode).toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IDENT', image: 'a' },
                    { type: 'IDENT', image: 'a' },
                    { type: 'IDENT', image: 'a' },
                ],
            });
        });

        it('should throw an error for unsatisfied oneOrMore expansion', () => {
            let parser = new Parser('b');
            let defs = [{ name: 'aTokens', image: 'a', oneOrMore: true, definite: true }];
            expect(parser.accept(defs, ASTNode)).to.eql(false);

            parser = new Parser('b');
            defs = [{ name: 'aTokens', image: 'a', oneOrMore: true, definite: true, mess: 'NOT FOUND' }];
            expect(() => parser.accept(defs, ASTNode)).to.throw('NOT FOUND (Line 1, Column 1)');
        });

        it('should handle repetition with a separator', () => {
            const parser = new Parser('a | a | a');
            const defs = [{ name: 'aTokens', image: 'a', zeroOrMore: true, definite: true, sep: { name: 'bars', image: '|' } }];
            expect(parser.accept(defs, ASTNode).toTree()).to.eql({
                type: 'ASTNode',
                children: [
                    { type: 'IDENT', image: 'a' },
                    { type: 'OPER', image: '|' },
                    { type: 'IDENT', image: 'a' },
                    { type: 'OPER', image: '|' },
                    { type: 'IDENT', image: 'a' },
                ],
            });
        });

        it('should error when a new item is expected after a separator but there isnt one', () => {
            let parser = new Parser('a | a |');
            let defs = [{ name: 'aTokens', image: 'a', zeroOrMore: true, definite: true, sep: { name: 'bars', image: '|' } }];
            expect(parser.accept(defs, ASTNode)).to.eql(false);
            parser = new Parser('a | a |');
            defs = [{ name: 'aTokens', image: 'a', zeroOrMore: true, definite: true, mess: 'NOT FOUND', sep: { name: 'bars', image: '|' } }];
            expect(() => parser.accept(defs, ASTNode)).to.throw('NOT FOUND (Line 1, Column 8)');
        });
    });
});
