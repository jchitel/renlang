import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ThrowStatement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ThrowStatement', () => {
    const parse = createParser(ThrowStatement);

    describe('visit()', generateVisitorTest(ThrowStatement, 'visitThrowStatement'));

    it('should parse a throw statement', () => {
        assert.containSubset(parse('throw 1'), { exp: {} });
    });
});
