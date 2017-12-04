import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { LambdaExpression, ShorthandLambdaExpression } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('LambdaExpression', () => {
    const parse = createParser(LambdaExpression);

    describe('visit()', generateVisitorTest(LambdaExpression, 'visitLambdaExpression'));

    it('should parse a lambda expression', () => {
        assert.containSubset(parse('() => 1'), { params: { length: 0 }, body: {} });
        assert.containSubset(parse('(a, int b) => 1'), {
            params: {
                length: 2,
                0: { name: 'a', typeNode: undefined },
                1: { name: 'b', typeNode: {} },
            },
            body: {},
        });
    });
});

describe('ShorthandLambdaExpression', () => {
    const parse = createParser(ShorthandLambdaExpression);

    describe('visit()', generateVisitorTest(ShorthandLambdaExpression, 'visitLambdaExpression'));

    it('should parse a shorthand lambda expression', () => {
        assert.containSubset(parse('a => 1'), {
            params: { length: 1, 0: { name: 'a', typeNode: undefined } },
            body: {},
        });
    });
});
