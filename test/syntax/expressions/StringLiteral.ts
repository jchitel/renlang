import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { StringLiteral } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('StringLiteral', () => {
    const parse = createParser(StringLiteral);

    describe('visit()', generateVisitorTest(StringLiteral, 'visitStringLiteral'));

    it('should parse a string literal', () => {
        assert.containSubset(parse('""'), { value: '' });
    });
});
