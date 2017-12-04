import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { VarDeclaration } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('VarDeclaration', () => {
    const parse = createParser(VarDeclaration);

    describe('visit()', generateVisitorTest(VarDeclaration, 'visitVarDeclaration'));

    it('should parse a var declaration', () => {
        assert.containSubset(parse('a = 1'), { name: 'a', initExp: {} });
    });
});
