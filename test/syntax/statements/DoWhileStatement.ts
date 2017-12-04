import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { DoWhileStatement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('DoWhileStatement', () => {
    const parse = createParser(DoWhileStatement);

    describe('visit()', generateVisitorTest(DoWhileStatement, 'visitDoWhileStatement'));

    it('should parse a do-while statement', () => {
        assert.containSubset(parse('do {} while (1)'), { body: {}, conditionExp: {} });
    });
});
