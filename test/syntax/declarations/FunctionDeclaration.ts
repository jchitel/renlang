import { assert } from 'chai';

import { createParser } from '~test/test-utils';
import { FunctionDeclaration, Param, Block, Statement } from '~/syntax';
import { generateVisitorTest } from '~test/syntax/test_utils';
import { TBool, TChar } from '~/typecheck/types';


describe('FunctionDeclaration', () => {
    const parse = createParser(FunctionDeclaration);

    describe('visit()', generateVisitorTest(FunctionDeclaration, 'visitFunctionDeclaration'));

    it('should parse a function declaration', () => {
        assert.containSubset(parse('func int a() => b'), {
            returnType: {},
            name: 'a',
            params: [],
            body: {},
        });
    });

    it('should parse a generic function declaration', () => {
        assert.containSubset(parse('func int a<A>() => b'), {
            returnType: {},
            name: 'a',
            typeParams: { length: 1 },
            params: [],
            body: {},
        });
    });

    it('should parse a function declaration with parameters', () => {
        assert.containSubset(parse('func int a(int b, int c) => d'), {
            returnType: {},
            name: 'a',
            params: { length: 2 },
            body: {},
        });
    });

    it('should parse a block-bodied function', () => {
        const body = parse('func int a() => {}').body;
        assert.instanceOf(body, Block);
    });

    it('should parse a statement-bodied function', () => {
        const body = parse('func int a() => return 1').body;
        assert.instanceOf(body, Statement);
    });

    it('should get pretty function name', () => {
        const func = new FunctionDeclaration();
        func.name = 'myFunc';
        func.params = [
            Object.assign(new Param(), { name: 'p1', type: new TBool() }),
            Object.assign(new Param(), { name: 'p2', type: new TChar() }),
        ];
        assert.strictEqual(func.prettyName(), 'myFunc(bool p1, char p2)');
    });
});

describe('Param', () => {
    const parse = createParser(Param);

    describe('visit()', generateVisitorTest(Param, 'visitParam'));

    it('should parse param', () => {
        assert.containSubset(parse('int a'), {
            typeNode: {},
            name: 'a',
        });
    });

    it('should ge pretty param name', () => {
        const param = new Param();
        param.name = 'myParam';
        param.type = new TBool();
        assert.strictEqual(param.prettyName(), 'bool myParam');
    });
});
