import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { IfElseExpression } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('IfElseExpression', () => {
    const parse = createParser(IfElseExpression);

    describe('visit()', generateVisitorTest(IfElseExpression, 'visitIfElseExpression'));

    it('should parse an if-else expression', () => {
        assert.containSubset(parse('if (1) 2 else 3'), {
            condition: {},
            consequent: {},
            alternate: {},
        });
    });
});
