import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { WhileStatement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('WhileStatement', () => {
    const parse = createParser(WhileStatement);

    describe('visit()', generateVisitorTest(WhileStatement, 'visitWhileStatement'));

    it('should parse a while statement', () => {
        assert.containSubset(parse('while (1) {}'), { conditionExp: {}, body: {} });
    });
});
