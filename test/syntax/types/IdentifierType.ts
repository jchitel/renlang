import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { IdentifierType } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('IdentifierType', () => {
    const parse = createParser(IdentifierType);

    describe('visit()', generateVisitorTest(IdentifierType, 'visitIdentifierType'));

    it('should parse an identifier type', () => {
        assert.containSubset(parse('a'), { name: 'a' });
    });
});
