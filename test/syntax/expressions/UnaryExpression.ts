import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { PrefixExpression, PostfixExpression, Expression } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('PrefixExpression', () => {
    const parse = createParser(PrefixExpression);

    describe('visit()', generateVisitorTest(PrefixExpression, 'visitUnaryExpression'));

    it('should parse a prefix expression', () => {
        assert.containSubset(parse('+1'), { target: {}, symbol: '+', prefix: true });
    });
});

describe('PostfixExpression', () => {
    // left-recursive, so we need to parse an expression
    const parse = createParser(Expression);

    describe('visit()', generateVisitorTest(PostfixExpression, 'visitUnaryExpression'));

    it('should parse a postfix expression', () => {
        assert.containSubset(parse('1++'), { target: {}, symbol: '++', prefix: false });
    });
});
