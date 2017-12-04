import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { BoolLiteral } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('BoolLiteral', () => {
    const parse = createParser(BoolLiteral);

    describe('visit()', generateVisitorTest(BoolLiteral, 'visitBoolLiteral'));

    it('should parse a bool literal', () => {
        assert.containSubset(parse('true'), { value: true });
        assert.containSubset(parse('false'), { value: false });
    });
});
