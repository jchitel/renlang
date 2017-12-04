import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ContinueStatement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ContinueStatement', () => {
    const parse = createParser(ContinueStatement);

    describe('visit()', generateVisitorTest(ContinueStatement, 'visitContinueStatement'));

    it('should parse a continue statement', () => {
        assert.containSubset(parse('continue'), { loopNumber: 0 });
        assert.containSubset(parse('continue 1'), { loopNumber: 1 });
    });
});
