import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { StructType } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('StructType', () => {
    const parse = createParser(StructType);

    describe('visit()', generateVisitorTest(StructType, 'visitStructType'));

    it('should parse a struct type', () => {
        assert.containSubset(parse('{}'), { fields: { length: 0 } });
        assert.containSubset(parse('{a b;c d}'), {
            fields: {
                length: 2,
                0: { type: {}, name: 'b' },
                1: { type: {}, name: 'd' },
            },
        });
    });
});
