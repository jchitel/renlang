import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { TypeDeclaration, TypeParam } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';


describe('TypeDeclaration', () => {
    const parse = createParser(TypeDeclaration);

    describe('visit()', generateVisitorTest(TypeDeclaration, 'visitTypeDeclaration'));

    it('should parse a type declaration', () => {
        assert.containSubset(parse('type MyType = int'), {
            name: 'MyType',
            typeNode: {},
        });
    });

    it('should parse a type declaration with type params', () => {
        assert.containSubset(parse('type MyType<A> = int'), {
            name: 'MyType',
            typeNode: {},
            typeParams: { length: 1 },
        });
    });
});

describe('TypeParam', () => {
    const parse = createParser(TypeParam);

    describe('visit()', generateVisitorTest(TypeParam, 'visitTypeParam'));

    it('should parse a type param', () => {
        assert.containSubset(parse('A'), { name: 'A', varianceOp: undefined, typeConstraint: undefined });
    });

    it('should parse a type param with a variance operator', () => {
        assert.containSubset(parse('+A'), { name: 'A', varianceOp: '+', typeConstraint: undefined });
        assert.containSubset(parse('-A'), { name: 'A', varianceOp: '-', typeConstraint: undefined });
    });

    it('should parse a type param with a type constraint', () => {
        assert.containSubset(parse('A : int'), { name: 'A', varianceOp: undefined, typeConstraint: {} });
    });

    it('should parse a type param with a variance operator and a type constraint', () => {
        assert.containSubset(parse('+A : int'), { name: 'A', varianceOp: '+', typeConstraint: {} });
    });
});
