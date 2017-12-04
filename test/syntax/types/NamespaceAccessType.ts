import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { NamespaceAccessType, Type } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('NamespaceAccessType', () => {
    // namespace accesses are left-recursive, so we need a Type parser
    const parse = createParser(Type);

    describe('visit()', generateVisitorTest(NamespaceAccessType, 'visitNamespaceAccessType'));

    it('should parse a namespace access type', () => {
        assert.containSubset(parse('a.b'), { baseType: {}, typeName: 'b' });
        assert.containSubset(parse('a.b.c.d'), {
            baseType: {
                baseType: {
                    baseType: { name: 'a' },
                    typeName: 'b',
                },
                typeName: 'c',
            },
            typeName: 'd',
        });
    });
});
