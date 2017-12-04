import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { ArrayType, Type } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('ArrayType', () => {
    // arrays are left-recursive, so we need to parse a type
    const parse = createParser(Type);

    describe('visit()', generateVisitorTest(ArrayType, 'visitArrayType'));

    it('should parse an array type', () => {
        assert.containSubset(parse('int[]'), { baseType: {} });
        assert.containSubset(parse('int[][][]'), { baseType: { baseType: { baseType: {} } } });
    });
});
