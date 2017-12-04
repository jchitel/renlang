import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { StructLiteral } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('StructLiteral', () => {
    const parse = createParser(StructLiteral);

    describe('visit()', generateVisitorTest(StructLiteral, 'visitStructLiteral'));

    it('should parse a struct literal', () => {
        assert.containSubset(parse('{}'), { entries: { length: 0 } });
        assert.containSubset(parse('{a:1,b:2}'), {
            entries: {
                length: 2,
                0: { key: 'a', value: {} },
                1: { key: 'b', value: {} },
            },
        });
    });
});
