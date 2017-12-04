import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ParenthesizedType } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ParenthesizedType', () => {
    const parse = createParser(ParenthesizedType);

    describe('visit()', generateVisitorTest(ParenthesizedType, 'visitParenthesizedType'));

    it('should parse a parenthesized type', () => {
        assert.containSubset(parse('(a)'), { inner: {} });
    });
});
