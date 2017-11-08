import { assert } from 'chai';

import { parse } from '~test/test-utils';
import * as accept from '~/parser/parser-impl'
import reduceProgram, * as reduce from '~/syntax/declarations/reduce';
import { Token } from '~/parser/Tokenizer';
import { Noop, Statement, Expression } from '~/syntax/ast';


/**
 * TODO all the locations should probably be tested...
 */
describe('Declaration reducers', () => {
    it('should reduce program', () => {
        const source = 'import from "b": a; func int f() => 1; type t = int; export e = 1';
        const program = parse(source, accept.acceptProgram);
        const ast = reduceProgram(program);
        assert.containSubset(ast, {
            imports: { length: 1 },
            functions: { length: 1 },
            types: { length: 1 },
            exports: { length: 1 },
        });
    });

    it('should reduce default import', () => {
        const imp = parse('import from "b": a', accept.acceptImportDeclaration);
        const ast = reduce.reduceImportDeclaration(imp);
        assert.containSubset(ast, {
            moduleName: 'b',
            importNames: { default: 'a' },
            locations: {
                moduleName: imp.moduleNameToken.getLocation(),
                import_default: (imp.imports.choice as Token).getLocation()
            }
        });
    });

    it('should reduce named imports', () => {
        const imp = parse('import from "b": { a as b, c }', accept.acceptImportDeclaration);
        const ast = reduce.reduceImportDeclaration(imp);
        assert.containSubset(ast, {
            moduleName: 'b',
            importNames: { a: 'b', c: 'c' },
        });
    });

    it('should reduce function declarations', () => {
        const func = parse('func int myFunc(bool b, char c) => 1', accept.acceptFunctionDeclaration);
        const ast = reduce.reduceFunctionDeclaration(func);
        assert.containSubset(ast, {
            returnType: {},
            name: 'myFunc',
            typeParams: [],
            params: { length: 2 },
            body: {},
        });
    });

    it('should reduce function declarations with type params', () => {
        const func = parse('func int myFunc<A, B>() => 1', accept.acceptFunctionDeclaration);
        const ast = reduce.reduceFunctionDeclaration(func);
        assert.containSubset(ast, {
            returnType: {},
            name: 'myFunc',
            typeParams: { length: 2 },
            params: [],
            body: {},
        });
    });

    it('should reduce param', () => {
        const param = parse('int a', accept.acceptParam);
        const ast = reduce.reduceParam(param);
        assert.containSubset(ast, {
            name: 'a',
            typeNode: {},
        });
    });

    it('should reduce function body', () => {
        let body = parse('{}', accept.acceptFunctionBody);
        let ast = reduce.reduceFunctionBody(body);
        assert.instanceOf(ast, Noop);

        body = parse('return', accept.acceptFunctionBody);
        ast = reduce.reduceFunctionBody(body);
        assert.instanceOf(ast, Statement);

        body = parse('1', accept.acceptFunctionBody);
        ast = reduce.reduceFunctionBody(body);
        assert.instanceOf(ast, Expression);
    });

    it('should reduce type declarations', () => {
        const type = parse('type t = int', accept.acceptTypeDeclaration);
        const ast = reduce.reduceTypeDeclaration(type);
        assert.containSubset(ast, {
            name: 't',
            typeNode: {},
            typeParams: [],
        });
    });

    it('should reduce type declarations with type params', () => {
        const type = parse('type t<A, B> = int', accept.acceptTypeDeclaration);
        const ast = reduce.reduceTypeDeclaration(type);
        assert.containSubset(ast, {
            name: 't',
            typeNode: {},
            typeParams: { length: 2 },
        });
    });

    it('should reduce type param list', () => {
        const params = parse('<A, +B, C : int>', accept.acceptTypeParamList);
        const list = reduce.reduceTypeParamList(params);
        assert.containSubset(list, [{
            name: 'A',
        }, {
            name: 'B',
            varianceOp: '+',
        }, {
            name: 'C',
            typeConstraint: {},
        }]);
    });

    it('should reduce default exports', () => {
        const exp = parse('export default 1', accept.acceptExportDeclaration);
        const ast = reduce.reduceExportDeclaration(exp);
        assert.containSubset(ast, {
            name: 'default',
            value: {},
        });
    });

    it('should reeduce named exports', () => {
        const exp = parse('export e = 1', accept.acceptExportDeclaration);
        const ast = reduce.reduceExportDeclaration(exp);
        assert.containSubset(ast, {
            name: 'e',
            value: {}
        });
    });
});
