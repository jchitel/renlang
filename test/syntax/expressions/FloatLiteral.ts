import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { FloatLiteral } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('FloatLiteral', () => {
    const parse = createParser(FloatLiteral);

    describe('visit()', generateVisitorTest(FloatLiteral, 'visitFloatLiteral'));

    it('should parse a float literal', () => {
        assert.containSubset(parse('1.5'), { value: 1.5 });
    });
});
