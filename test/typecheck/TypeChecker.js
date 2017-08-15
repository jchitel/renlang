import { expect } from 'chai';
import { resolve, dirname } from 'path';
import { readFileSync as readFile } from 'fs';

import TypeChecker from '../../src/typecheck/TypeChecker';
import Module from '../../src/runtime/Module';
import parse from '../../src/parser';
import { TypeDeclaration, FunctionDeclaration } from '../../src/ast/declarations';
import { TUnknown, TRecursive } from '../../src/typecheck/types';


function loc(startLine, startColumn, endLine, endColumn) {
    return { startLine, startColumn, endLine, endColumn };
}

describe('TypeChecker', () => {
    it('should construct a TypeChecker', () => {
        const tc = new TypeChecker();
        expect({ ...tc }).to.eql({ modules: [], moduleCache: {}, errors: [] });
    });

    describe('Import Processing', () => {
        it('should error for non-existent import path', () => {
            const ast = parse('import from "./idontexist": Something');
            const path = resolve(dirname(__filename), '../testfiles/someModule.ren');
            const module = new Module(0, path, ast.reduce());
            const tc = new TypeChecker();
            tc.processImport(module, module.ast.imports[0]);
            expect(tc.errors.map(e => e.message)).to.eql([`Module "./idontexist" does not exist [${path}:1:13]`]);
        });

        it('should load imported module and process imports', () => {
            // set up main module
            const ast = parse('import from ".": Something');
            const path = resolve(dirname(__filename), '../testfiles/someModule.ren');
            const module = new Module(0, path, ast.reduce());
            // create type checker, add main module to it
            const tc = new TypeChecker();
            tc.modules.push(module);
            tc.moduleCache[path] = 0;
            // set up stub processDeclarations
            let called = false;
            tc.processDeclarations = (imported) => {
                called = true;
                imported.exports.default = { kind: 'expr' };
            };
            // process the import
            tc.processImport(module, module.ast.imports[0]);
            // assert the type checker state
            expect(called).to.eql(true);
            expect(tc.errors).to.eql([]);
            expect(tc.modules.length).to.eql(2);
            expect(tc.moduleCache).to.eql({ [path]: 0, [resolve(dirname(__filename), '../testfiles/index.ren')]: 1 });
            // assert the module state
            expect(module.imports.Something).to.eql({
                moduleId: 1,
                exportName: 'default',
                kind: 'expr',
                ast: module.ast.imports[0],
            });
            expect(module.constants.Something).to.eql({ imported: true });
        });

        it('should load cached module and process imports', () => {
            // set up main module
            const ast = parse('import from "." { myFunc, myType }');
            const path = resolve(dirname(__filename), '../testfiles/someModule.ren');
            const module = new Module(0, path, ast.reduce());
            // set up imported module
            const importedPath = resolve(dirname(__filename), '../testfiles/index.ren');
            const importedModule = new Module(1, importedPath);
            importedModule.exports = {
                default: { kind: 'expr' },
                myFunc: { kind: 'func' },
                myType: { kind: 'type' },
            };
            // create type checker, add modules to it
            const tc = new TypeChecker();
            tc.modules = [module, importedModule];
            tc.moduleCache = { [path]: 0, [importedPath]: 1 };
            // process the import
            tc.processImport(module, module.ast.imports[0]);
            // assert the type checker state
            expect(tc.errors).to.eql([]);
            expect(tc.modules.length).to.eql(2);
            expect(Object.keys(tc.moduleCache).length).to.eql(2);
            // assert the module state
            expect(module.imports).to.eql({
                myFunc: { moduleId: 1, exportName: 'myFunc', kind: 'func', ast: module.ast.imports[0] },
                myType: { moduleId: 1, exportName: 'myType', kind: 'type', ast: module.ast.imports[0] },
            });
            expect(module.functions).to.eql({ myFunc: { imported: true } });
            expect(module.types).to.eql({ myType: { imported: true } });
        });

        it('should error for non-exported import', () => {
            // set up main module
            const ast = parse('import from "." { idontexist }');
            const path = resolve(dirname(__filename), '../testfiles/someModule.ren');
            const module = new Module(0, path, ast.reduce());
            // set up imported module
            const importedPath = resolve(dirname(__filename), '../testfiles/index.ren');
            const importedModule = new Module(1, importedPath);
            importedModule.exports = {
                default: { kind: 'expr' },
                myFunc: { kind: 'func' },
                myType: { kind: 'type' },
            };
            // create type checker, add modules to it
            const tc = new TypeChecker();
            tc.modules = [module, importedModule];
            tc.moduleCache = { [path]: 0, [importedPath]: 1 };
            // process the import
            tc.processImport(module, module.ast.imports[0]);
            // assert error
            expect(tc.errors.map(e => e.message)).to.eql([`Module "." does not have an export with name "idontexist" [${path}:1:19]`]);
        });

        it('should error for name-clashed import', () => {
            // set up main module
            const ast = parse('import from "." { myFunc };import from "." { myFunc }');
            const path = resolve(dirname(__filename), '../testfiles/someModule.ren');
            const module = new Module(0, path, ast.reduce());
            // set up imported module
            const importedPath = resolve(dirname(__filename), '../testfiles/index.ren');
            const importedModule = new Module(1, importedPath);
            importedModule.exports = {
                default: { kind: 'expr' },
                myFunc: { kind: 'func' },
                myType: { kind: 'type' },
            };
            // create type checker, add modules to it
            const tc = new TypeChecker();
            tc.modules = [module, importedModule];
            tc.moduleCache = { [path]: 0, [importedPath]: 1 };
            // process the imports
            tc.processImport(module, module.ast.imports[0]);
            tc.processImport(module, module.ast.imports[1]);
            // assert error
            expect(tc.errors.map(e => e.message)).to.eql([`A value with name "myFunc" is already declared [${path}:1:46]`]);
        });
    });

    describe('Type Declaration Processing', () => {
        it('should handle name clash between two types', () => {
            const module = { types: { myType: {} }, path: '/index.ren' };
            const type = { name: 'myType', locations: { name: loc(1, 1, 1, 1) } };
            const tc = new TypeChecker();
            tc.processType(module, type);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myType" is already declared [/index.ren:1:1]']);
        });

        it('should handle name clash between a type and function', () => {
            const module = { types: {}, functions: { funcType: { ast: { locations: { name: loc(1, 1, 1, 1) } } } }, path: '/index.ren' };
            const type = { name: 'funcType', locations: { name: loc(1, 2, 1, 2) } };
            const tc = new TypeChecker();
            tc.processType(module, type);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "funcType" is already declared [/index.ren:1:2]']);
            expect(module.types.funcType.ast).to.eql(type);
        });

        it('should add a type to a module', () => {
            const module = { types: {}, functions: {} };
            const type = { name: 'myType' };
            const tc = new TypeChecker();
            tc.processType(module, type);
            expect(tc.errors).to.eql([]);
            expect(module.types.myType.ast).to.eql(type);
        });
    });

    describe('Function Declaration Processing', () => {
        it('should handle name clash between two functions', () => {
            const module = { functions: { myFunc: {} }, path: '/index.ren' };
            const func = { name: 'myFunc', locations: { name: loc(1, 1, 1, 1) } };
            const tc = new TypeChecker();
            tc.processFunction(module, func);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myFunc" is already declared [/index.ren:1:1]']);
        });

        it('should handle name clash between a function and type', () => {
            const module = { functions: {}, types: { funcType: { ast: { locations: { name: loc(1, 2, 1, 2) } } } }, path: '/index.ren' };
            const func = { name: 'funcType', locations: { name: loc(1, 1, 1, 1) } };
            const tc = new TypeChecker();
            tc.processFunction(module, func);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "funcType" is already declared [/index.ren:1:2]']);
            expect(module.functions.funcType.ast).to.eql(func);
        });

        it('should add a function to a module', () => {
            const module = { types: {}, functions: {} };
            const func = { name: 'myFunc' };
            const tc = new TypeChecker();
            tc.processFunction(module, func);
            expect(tc.errors).to.eql([]);
            expect(module.functions.myFunc.ast).to.eql(func);
        });
    });

    describe('Export Processing', () => {
        it('should handle name clash between two exports', () => {
            const module = { exports: { myExport: {} }, path: '/index.ren' };
            const exp = { name: 'myExport', locations: { name: loc(1, 1, 1, 1) } };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['An export with name "myExport" is already declared [/index.ren:1:1]']);
        });

        it('should handle exported type', () => {
            const module = { exports: {}, types: {}, functions: {} };
            const exp = { name: 'myType', value: new TypeDeclaration({ name: 'myType' }) };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myType: { kind: 'type', valueName: 'myType' } });
            expect(module.types).to.eql({ myType: { ast: exp.value } });
        });

        it('should handle exported function', () => {
            const module = { exports: {}, types: {}, functions: {} };
            const exp = { name: 'myFunc', value: new FunctionDeclaration({ name: 'myFunc' }) };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myFunc: { kind: 'func', valueName: 'myFunc' } });
            expect(module.functions).to.eql({ myFunc: { ast: exp.value } });
        });

        it('should handle name clash between two constants', () => {
            const module = { exports: {}, constants: { myConst: {} }, path: '/index.ren' };
            const exp = { name: 'myConst', value: {}, locations: { name: loc(1, 1, 1, 1) } };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myConst" is already declared [/index.ren:1:1]']);
        });

        it('should handle name clash between a constant and type', () => {
            const module = { exports: {}, constants: {}, types: { myConst: { ast: { locations: { name: loc(1, 2, 1, 2) } } } }, path: '/index.ren' };
            const exp = { name: 'myConst', value: {}, locations: { name: loc(1, 1, 1, 1) } };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myConst" is already declared [/index.ren:1:2]']);
        });

        it('should handle name clash between a constant and function', () => {
            const module = { exports: {}, constants: {}, types: {}, functions: { myConst: { ast: { locations: { name: loc(1, 2, 1, 2) } } } }, path: '/index.ren' };
            const exp = { name: 'myConst', value: {}, locations: { name: loc(1, 1, 1, 1) } };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myConst" is already declared [/index.ren:1:2]']);
        });

        it('should handle exported constant', () => {
            const module = { exports: {}, constants: {}, types: {}, functions: {} };
            const exp = { name: 'myConst', value: {} };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myConst: { kind: 'expr', valueName: 'myConst' } });
            expect(module.constants).to.eql({ myConst: { ast: exp } });
        });

        it('should handle exported import', () => {
            const module = { exports: {}, imports: { myImport: { kind: 'expr' } } };
            const exp = { name: 'myImport' };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myImport: { kind: 'expr', valueName: 'myImport' } });
        });

        it('should handle exported declared types', () => {
            const module = { exports: {}, imports: {}, types: { myType: {} } };
            const exp = { name: 'myType' };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myType: { kind: 'type', valueName: 'myType' } });
        });

        it('should handle exported declared function', () => {
            const module = { exports: {}, imports: {}, types: {}, functions: { myFunc: {} } };
            const exp = { name: 'myFunc' };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myFunc: { kind: 'func', valueName: 'myFunc' } });
        });

        it('should error for exporting an undefined value', () => {
            const module = { exports: {}, imports: {}, types: {}, functions: {}, path: '/index.ren' };
            const exp = { name: 'myValue', locations: { name: loc(1, 1, 1, 1) } };
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['Value "myValue" is not defined [/index.ren:1:1]']);
        });
    });

    describe('Type Resolution', () => {
        it('should skip already resolved type', () => {
            const type = { ast: { type: 'type' } };
            expect(new TypeChecker().resolveType({}, type)).to.eql('type');
        });

        it('should error for circular dependency', () => {
            const module = { path: '/index.ren' };
            const decl = { resolving: true, ast: { locations: { self: loc(1, 1, 1, 1) } } };
            const tc = new TypeChecker();
            expect(tc.resolveType(module, decl)).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Cannot resolve type, circular dependency found [/index.ren:1:1]']);
        });

        it('should resolve type of function declaration', () => {
            const module = {};
            const decl = { ast: new FunctionDeclaration({}) };
            decl.ast.resolveType = () => { decl.ast.type = 'type' };
            const tc = new TypeChecker();
            expect(tc.resolveType(module, decl)).to.eql('type');
        });

        it('should resolve type of non-function declaration', () => {
            const module = {};
            const decl = { ast: {} };
            decl.ast.resolveType = () => {
                decl.ast.type = 'type';
                expect(decl.resolving).to.eql(true);
            };
            const tc = new TypeChecker();
            expect(tc.resolveType(module, decl)).to.eql('type');
            expect(decl.resolving).to.eql(false);
        });

        it('should retrieve a local, already resolved type', () => {
            const module = { types: { myType: { ast: { type: 'int' } } } };
            expect(new TypeChecker().getType(module, 'myType')).to.eql('int');
        });

        it('should retrieve a recursive type', () => {
            const module = { types: { myType: { resolving: true, ast: {} } } };
            expect(new TypeChecker().getType(module, 'myType')).to.eql(new TRecursive({ resolving: true, ast: {} }));
        });

        it('should resolve and retrieve a type', () => {
            const module = { types: { myType: { ast: { resolveType: () => { module.types.myType.ast.type = 'int' } } } } };
            expect(new TypeChecker().getType(module, 'myType')).to.eql('int');
        });

        it('should retrieve an imported type', () => {
            const module = { types: { myType: { imported: true } }, imports: { myType: { moduleId: 1, exportName: 'default' } } };
            const importedModule = { exports: { default: { valueName: 'theType' } }, types: { theType: { ast: { type: 'int' } } } };
            const tc = new TypeChecker();
            tc.modules = [module, importedModule];
            expect(tc.getType(module, 'myType')).to.eql('int');
        });

        it('should return null for non-existent value', () => {
            const module = { functions: {}, constants: {} };
            expect(new TypeChecker().getValueType(module, 'someName')).to.eql(null);
        });

        it('should retrieve the type of a local, already resolved value', () => {
            const module = { functions: {}, constants: { myValue: { ast: { type: 'int' } } } };
            expect(new TypeChecker().getValueType(module, 'myValue')).to.eql('int');
        });

        it('should resolve and retrieve a value\'s type', () => {
            const module = { functions: {}, constants: { myValue: { ast: { resolveType: () => { module.constants.myValue.ast.type = 'int' } } } } };
            expect(new TypeChecker().getValueType(module, 'myValue')).to.eql('int');
        });

        it('should retrive the type of an imported value', () => {
            const module = { functions: {}, constants: { myValue: { imported: true } }, imports: { myValue: { moduleId: 1, exportName: 'default' } } };
            const importedModule = { exports: { default: { valueName: 'theValue' } }, functions: {}, constants: { theValue: { ast: { type: 'int' } } } };
            const tc = new TypeChecker();
            tc.modules = [module, importedModule];
            expect(tc.getValueType(module, 'myValue')).to.eql('int');
        });
    });

    describe('Top-level tests', () => {
        it('should perform semantic analysis on a program', () => {
            const path = resolve(dirname(__filename), '../testfiles/test.ren');
            const contents = readFile(path).toString();
            const parsed = parse(contents);
            // type check the parsed result
            const tc = new TypeChecker();
            const modules = tc.check(parsed, path);
            // assert the result
            expect(modules.length).to.eql(2);
            expect(tc.errors).to.eql([]);
        });

        it('should throw aggregate error', () => {
            const path = resolve(dirname(__filename), '../testfiles/error.ren');
            const contents = readFile(path).toString();
            const parsed = parse(contents);
            const tc = new TypeChecker();
            expect(() => tc.check(parsed, path)).to.throw(`Value "noFunc" is not defined [${path}:1:22]`);
        });
    });
});
