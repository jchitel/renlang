import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { Expression } from '~/syntax';


describe('Expression', () => {
    const parse = createParser(Expression);

    it('should parse an array access as an expression', () => {
        assert.isDefined(parse('a[1]'));
    });
    it('should parse an array literal as an expression', () => {
        assert.isDefined(parse('[]'));
    });
    it('should parse a binary expression as an expression', () => {
        assert.isDefined(parse('1+1'));
    });
    it('should parse a bool literal as an expression', () => {
        assert.isDefined(parse('true'));
    });
    it('should parse a char literal as an expression', () => {
        assert.isDefined(parse("'a'"));
    });
    it('should parse a field access as an expression', () => {
        assert.isDefined(parse('a.b'));
    });
    it('should parse a float literal as an expression', () => {
        assert.isDefined(parse('1.5'));
    });
    it('should parse a function application as an expression', () => {
        assert.isDefined(parse('a()'));
    });
    it('should parse an identifier as an expression', () => {
        assert.isDefined(parse('a'));
    });
    it('should parse an if-else as an expression', () => {
        assert.isDefined(parse('if (1) 2 else 3'));
    });
    it('should parse an integer literal as an expression', () => {
        assert.isDefined(parse('1'));
    });
    it('should parse a lambda as an expression', () => {
        assert.isDefined(parse('()=>1'));
    });
    it('should parse a parenthesized expression as an expression', () => {
        assert.isDefined(parse('(1)'));
    });
    it('should parse a string literal as an expression', () => {
        assert.isDefined(parse('""'));
    });
    it('should parse a struct literal as an expression', () => {
        assert.isDefined(parse('{}'));
    });
    it('should parse a tuple literal as an expression', () => {
        assert.isDefined(parse('()'));
    });
    it('should parse a unary expression as an expression', () => {
        assert.isDefined(parse('+1'));
    });
    it('should parse a var declaration as an expression', () => {
        assert.isDefined(parse('a=1'));
    });
});
