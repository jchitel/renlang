import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ArrayAccess, Expression } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ArrayAccess', () => {
    // array accesses are left-recursive, so we need to parse an expression
    const parse = createParser(Expression);

    describe('visit()', generateVisitorTest(ArrayAccess, 'visitArrayAccess'));

    it('should parse an array access', () => {
        assert.containSubset(parse('a[1]'), { target: {}, indexExp: {} });
        assert.containSubset(parse('a[1][1][1]'), {
            target: {
                target: {
                    target: {},
                    indexExp: {},
                },
                indexExp: {},
            },
            indexExp: {},
        });
    });
});
