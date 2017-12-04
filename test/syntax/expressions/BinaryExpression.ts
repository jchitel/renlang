import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { BinaryExpression, Expression } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('BinaryExpression', () => {
    // binary expressions are left-recursive, so we need to parse an expression
    const parse = createParser(Expression);

    describe('visit()', generateVisitorTest(BinaryExpression, 'visitBinaryExpression'));

    it('should parse a binary expression', () => {
        assert.containSubset(parse('1+1'), { left: {}, symbol: '+', right: {} });
        assert.containSubset(parse('1+1-1*1'), {
            left: {},
            symbol: '+',
            right: {
                left: {},
                symbol: '-',
                right: {
                    left: {},
                    symbol: '*',
                    right: {},
                },
            },
        });
    });
});
