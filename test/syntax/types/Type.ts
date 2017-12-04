import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { Type } from '~/syntax';


describe('Type', () => {
    const parse = createParser(Type);

    it('should parse an array type as a type', () => {
        assert.isDefined(parse('int[]'));
    });
    it('should parse an identifier type as a type', () => {
        assert.isDefined(parse('a'));
    });
    it('should parse a built-in type as a type', () => {
        assert.isDefined(parse('int'));
    });
    it('should parse a tuple type as a type', () => {
        assert.isDefined(parse('()'));
    });
    it('should parse a parenthesized type as a type', () => {
        assert.isDefined(parse('(int)'));
    });
    it('should parse a function type as a type', () => {
        assert.isDefined(parse('(int) => int'));
    });
    it('should parse a namespace access type as a type', () => {
        assert.isDefined(parse('a.b'));
    });
    it('should parse a specific type as a type', () => {
        assert.isDefined(parse('a<int>'));
    });
    it('should parse a struct type as a type', () => {
        assert.isDefined(parse('{}'));
    });
    it('should parse a union type as a type', () => {
        assert.isDefined(parse('a | b'));
    });
});
