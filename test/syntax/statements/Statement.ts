import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { Statement } from '~/syntax';


describe('Statement', () => {
    const parse = createParser(Statement);

    it('should parse a block as a statement', () => {
        assert.isDefined(parse('{}'));
    });
    it('should parse a break as a statement', () => {
        assert.isDefined(parse('break'));
    });
    it('should parse a continue as a statement', () => {
        assert.isDefined(parse('continue'));
    });
    it('should parse a do-while as a statement', () => {
        assert.isDefined(parse('do {} while (true)'));
    });
    it('should parse an expression as a statement', () => {
        assert.isDefined(parse('1'));
    });
    it('should parse a for loop as a statement', () => {
        assert.isDefined(parse('for (i in is) {}'));
    });
    it('should parse a return as a statement', () => {
        assert.isDefined(parse('return'));
    });
    it('should parse a throw as a statement', () => {
        assert.isDefined(parse('throw 1'));
    });
    it('should parse a try-catch as a statement', () => {
        assert.isDefined(parse('try {} catch (int i) {}'));
    });
    it('should parse a while loop as a statement', () => {
        assert.isDefined(parse('while (true) {}'));
    });
});
