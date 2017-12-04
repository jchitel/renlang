import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { FieldAccess, Expression } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('FieldAccess', () => {
    // field accesses are left-recursive, so we need to parse an expression
    const parse = createParser(Expression);

    describe('visit()', generateVisitorTest(FieldAccess, 'visitFieldAccess'));

    it('should parse a field access', () => {
        assert.containSubset(parse('a.b'), { target: {}, field: 'b' });
        assert.containSubset(parse('a.b.c.d'), {
            target: { target: { target: {}, field: 'b' }, field: 'c' },
            field: 'd',
        });
    });
});
