import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { IdentifierExpression } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('IdentifierExpression', () => {
    const parse = createParser(IdentifierExpression);

    describe('visit()', generateVisitorTest(IdentifierExpression, 'visitIdentifierExpression'));

    it('should parse an identifier', () => {
        assert.containSubset(parse('a'), { name: 'a' });
    });
});
