import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { IntegerLiteral } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('IntegerLiteral', () => {
    const parse = createParser(IntegerLiteral);

    describe('visit()', generateVisitorTest(IntegerLiteral, 'visitIntegerLiteral'));

    it('should parse an integer literal', () => {
        assert.containSubset(parse("1"), { value: 1 });
    });
});
