import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { FunctionApplication, Expression } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('FunctionApplication', () => {
    // function apps are left-recursive, so we need to parse an expression
    const parse = createParser(Expression);

    describe('visit()', generateVisitorTest(FunctionApplication, 'visitFunctionApplication'));

    it('should parse a function application', () => {
        assert.containSubset(parse('a()'), { target: {}, args: { length: 0 } });
        assert.containSubset(parse('a(1, 2)'), { target: {}, args: { length: 2 } });
        assert.containSubset(parse('a<A, B>()'), { target: {}, typeArgs: { length: 2 }, args: { length: 0 } });
    });
});
