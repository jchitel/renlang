import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { BreakStatement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('BreakStatement', () => {
    const parse = createParser(BreakStatement);

    describe('visit()', generateVisitorTest(BreakStatement, 'visitBreakStatement'));

    it('should parse a break statement', () => {
        assert.containSubset(parse('break'), { loopNumber: 0 });
        assert.containSubset(parse('break 1'), { loopNumber: 1 });
    });
});
