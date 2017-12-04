import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ArrayLiteral } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ArrayLiteral', () => {
    const parse = createParser(ArrayLiteral);

    describe('visit()', generateVisitorTest(ArrayLiteral, 'visitArrayLiteral'));

    it('should parse an array literal', () => {
        assert.containSubset(parse('[]'), { items: { length: 0 } });
        assert.containSubset(parse('[1, 2]'), { items: { length: 2 } });
    });
});
