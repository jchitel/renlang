import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ParenthesizedExpression } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ParenthesizedExpression', () => {
    const parse = createParser(ParenthesizedExpression);

    describe('visit()', generateVisitorTest(ParenthesizedExpression, 'visitParenthesizedExpression'));

    it('should parse a parenthesized expression', () => {
        assert.containSubset(parse('(1)'), { inner: {} });
    });
});
