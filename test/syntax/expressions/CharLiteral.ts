import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { CharLiteral } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('CharLiteral', () => {
    const parse = createParser(CharLiteral);

    describe('visit()', generateVisitorTest(CharLiteral, 'visitCharLiteral'));

    it('should parse a char literal', () => {
        assert.containSubset(parse("'a'"), { value: 'a' });
    });
});
