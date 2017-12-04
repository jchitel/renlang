import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { TupleLiteral } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('TupleLiteral', () => {
    const parse = createParser(TupleLiteral);

    describe('visit()', generateVisitorTest(TupleLiteral, 'visitTupleLiteral'));

    it('should parse a tuple literal', () => {
        assert.containSubset(parse('()'), { items: { length: 0 } });
        assert.containSubset(parse('(1, 2)'), { items: { length: 2 } });
    });
});
