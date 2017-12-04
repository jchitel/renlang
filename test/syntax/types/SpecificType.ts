import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { SpecificType, Type } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('SpecificType', () => {
    // specific types are left-recursive, so we need to parse a type
    const parse = createParser(Type);

    describe('visit()', generateVisitorTest(SpecificType, 'visitSpecificType'));

    it('should parse a specific type', () => {
        assert.containSubset(parse('a<b>'), { typeNode: {}, typeArgs: { length: 1 } });
    });
});
