import { assert } from 'chai';

import { parse } from '~test/test-utils';
import * as accept from '~/parser/parser-impl'
import reduceType, * as reduce from '~/syntax/types/reduce';
import { Type } from '~/syntax/types/ast';
import { STArrayType, STUnionType, STSpecificType } from '~/syntax/types/cst';


describe('Type reducers', () => {
    it('should reduce a primitive type', () => {
        const type = parse('int', accept.acceptType);
        const ast = reduceType(type);
        assert.containSubset(ast, {
            typeNode: 'int',
        });
    });

    it('should reduce an identifier type', () => {
        const type = parse('a', accept.acceptType);
        const ast = reduceType(type);
        assert.containSubset(ast, {
            name: 'a',
        });
    });

    it('should reduce a type', () => {
        const type = parse('()', accept.acceptType);
        const ast = reduceType(type);
        assert.instanceOf(ast, Type);
    });

    it('should reduce a parenthesized type', () => {
        const type = parse('(int)', accept.acceptParenthesizedType);
        const ast = reduce.reduceParenthesizedType(type);
        assert.containSubset(ast, {
            inner: {},
        });
    });

    it('should reduce a function type', () => {
        const type = parse('(int, bool) => char', accept.acceptFunctionType);
        const ast = reduce.reduceFunctionType(type);
        assert.containSubset(ast, {
            paramTypes: { length: 2 },
            returnType: {},
        });
    });

    it('should reduce a tuple type', () => {
        const type = parse('(int, bool)', accept.acceptTupleType);
        const ast = reduce.reduceTupleType(type);
        assert.containSubset(ast, {
            types: { length: 2 },
        });
    });

    it('should reduce a struct type', () => {
        const type = parse('{ int a; char b }', accept.acceptStructType);
        const ast = reduce.reduceStructType(type);
        assert.containSubset(ast, {
            fields: [{ type: {}, name: 'a' }, { type: {}, name: 'b' }],
        });
    });

    it('should reduce an array type', () => {
        const type = parse('int[]', accept.acceptType).choice as STArrayType;
        const ast = reduce.reduceArrayType(type);
        assert.containSubset(ast, {
            baseType: {},
        });
    });

    it('should reduce a union type', () => {
        const type = parse('int | bool', accept.acceptType).choice as STUnionType;
        const ast = reduce.reduceUnionType(type);
        assert.containSubset(ast, {
            types: { length: 2 },
        });
    });

    it('should reduce a deep union type', () => {
        const type = parse('int | bool | char | float', accept.acceptType).choice as STUnionType;
        const ast = reduce.reduceUnionType(type);
        assert.containSubset(ast, {
            types: { length: 4 },
        });
    });

    it('should reduce a specific type', () => {
        const type = parse('Type<int, bool>', accept.acceptType).choice as STSpecificType;
        const ast = reduce.reduceSpecificType(type);
        assert.containSubset(ast, {
            typeNode: {},
            typeArgs: { length: 2 },
        });
    });
});
