import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { FunctionType } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('FunctionType', () => {
    const parse = createParser(FunctionType);

    describe('visit()', generateVisitorTest(FunctionType, 'visitFunctionType'));

    it('should parse a function type', () => {
        assert.containSubset(parse('() => int'), {
            paramTypes: { length: 0 },
            returnType: {},
        });
        assert.containSubset(parse('(int, int) => int'), {
            paramTypes: { length: 2 },
            returnType: {},
        });
    });
});
