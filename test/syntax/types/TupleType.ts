import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { TupleType } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('TupleType', () => {
    const parse = createParser(TupleType);

    describe('visit()', generateVisitorTest(TupleType, 'visitTupleType'));

    it('should parse a tuple type', () => {
        assert.containSubset(parse('()'), { types: { length: 0 } });
        assert.containSubset(parse('(a, b)'), { types: { length: 2 } });
    });
});
