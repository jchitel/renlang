import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { UnionType, Type } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('UnionType', () => {
    // unions are left-recursive, so we need to parse a type
    const parse = createParser(Type);

    describe('visit()', generateVisitorTest(UnionType, 'visitUnionType'));

    it('should parse a union type', () => {
        assert.containSubset(parse('a|b'), { types: { length: 2 } });
        assert.containSubset(parse('a|b|c|d'), { types: { length: 4 } });
    });
});
