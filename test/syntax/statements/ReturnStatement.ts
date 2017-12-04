import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ReturnStatement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ReturnStatement', () => {
    const parse = createParser(ReturnStatement);

    describe('visit()', generateVisitorTest(ReturnStatement, 'visitReturnStatement'));

    it('should parse a return statement', () => {
        assert.containSubset(parse('return'), { exp: undefined });
        assert.containSubset(parse('return 1'), { exp: {} });
    });
});
