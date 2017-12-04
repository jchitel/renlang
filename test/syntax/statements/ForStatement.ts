import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ForStatement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ForStatement', () => {
    const parse = createParser(ForStatement);

    describe('visit()', generateVisitorTest(ForStatement, 'visitForStatement'));

    it('should parse a for statement', () => {
        assert.containSubset(parse('for (i in is) {}'), { iterVar: 'i', iterableExp: {}, body: {} });
    });
});
