import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ExpressionStatement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ExpressionStatement', () => {
    const parse = createParser(ExpressionStatement);

    describe('visit()', generateVisitorTest(ExpressionStatement, 'visitExpressionStatement'));

    it('should parse an expression statement', () => {
        assert.containSubset(parse('1'), { expression: {} });
    });
});
