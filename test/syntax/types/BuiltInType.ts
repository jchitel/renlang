import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { BuiltInType, builtInTypes } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('BuiltInType', () => {
    const parse = createParser(BuiltInType);

    describe('visit()', generateVisitorTest(BuiltInType, 'visitBuiltInType'));

    it('should parse a built-in type', () => {
        for (const t of builtInTypes) {
            assert.containSubset(parse(t), { typeNode: t });
        }
    });
});
