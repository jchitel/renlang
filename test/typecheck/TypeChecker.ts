import { expect } from 'chai';
import { resolve, dirname } from 'path';
import { readFileSync as readFile } from 'fs';
import * as sinon from 'sinon';

import { Location } from '~/parser/Tokenizer';
import TypeChecker from '../../src/typecheck/TypeChecker';
import Module from '../../src/runtime/Module';
import parse from '../../src/parser';
import {
    Program, ImportDeclaration, TypeDeclaration, FunctionDeclaration, ExportDeclaration, IntegerLiteral
} from '../../src/syntax/ast';
import { TUnknown, TRecursive, TAny } from '../../src/typecheck/types';
import reduceProgram from '~/syntax/declarations/reduce';
import { FunctionFunc } from '~/translator/Func';
import { mock } from '~test/test-utils';


function loc(startLine: number, startColumn: number, endLine: number, endColumn: number) {
    return new Location(startLine, startColumn, endLine, endColumn);
}

let sandbox: sinon.SinonSandbox;

describe('TypeChecker', () => {
    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it('should construct a TypeChecker', () => {
        const tc = new TypeChecker();
        expect({ ...tc }).to.eql({ modules: [], moduleCache: {}, errors: [] });
    });

    describe('Import Processing', () => {
        it('should error for non-existent import path', () => {
            const ast = parse('import from "./idontexist": Something');
            const path = resolve(dirname(__filename), '../testfiles/someModule.ren');
            const module = new Module(0, path, reduceProgram(ast));
            const tc = new TypeChecker();
            tc.processImport(module, module.ast.imports[0]);
            expect(tc.errors.map(e => e.message)).to.eql([`Module "./idontexist" does not exist [${path}:1:13]`]);
        });

        it('should load imported module and process imports', () => {
            // set up main module
            const ast = parse('import from ".": Something');
            const path = resolve(dirname(__filename), '../../../testfiles/someModule.ren');
            const module = new Module(0, path, reduceProgram(ast));
            // create type checker, add main module to it
            const tc = new TypeChecker();
            tc.modules.push(module);
            tc.moduleCache[path] = 0;
            // set up stub processDeclarations
            let called = false;
            tc.processDeclarations = (imported) => {
                called = true;
                imported.exports.default = { kind: 'expr', valueName: '' };
            };
            // process the import
            tc.processImport(module, module.ast.imports[0]);
            // assert the type checker state
            expect(called).to.eql(true);
            expect(tc.errors).to.eql([]);
            expect(tc.modules.length).to.eql(2);
            expect(tc.moduleCache).to.eql({ [path]: 0, [resolve(dirname(__filename), '../../../testfiles/index.ren')]: 1 });
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
            const ast = parse('import from ".": { myFunc, myType }');
            const path = resolve(dirname(__filename), '../../../testfiles/someModule.ren');
            const module = new Module(0, path, reduceProgram(ast));
            // set up imported module
            const importedPath = resolve(dirname(__filename), '../../../testfiles/index.ren');
            const importedModule = new Module(1, importedPath);
            importedModule.exports = {
                default: { kind: 'expr', valueName: '' },
                myFunc: { kind: 'func', valueName: '' },
                myType: { kind: 'type', valueName: '' },
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
            const ast = parse('import from ".": { idontexist }');
            const path = resolve(dirname(__filename), '../../../testfiles/someModule.ren');
            const module = new Module(0, path, reduceProgram(ast));
            // set up imported module
            const importedPath = resolve(dirname(__filename), '../../../testfiles/index.ren');
            const importedModule = new Module(1, importedPath);
            importedModule.exports = {
                default: { kind: 'expr', valueName: '' },
                myFunc: { kind: 'func', valueName: '' },
                myType: { kind: 'type', valueName: '' },
            };
            // create type checker, add modules to it
            const tc = new TypeChecker();
            tc.modules = [module, importedModule];
            tc.moduleCache = { [path]: 0, [importedPath]: 1 };
            // process the import
            tc.processImport(module, module.ast.imports[0]);
            // assert error
            expect(tc.errors.map(e => e.message)).to.eql([`Module "." does not have an export with name "idontexist" [${path}:1:20]`]);
        });

        it('should error for name-clashed import', () => {
            // set up main module
            const ast = parse('import from ".": { myFunc };import from ".": { myFunc }');
            const path = resolve(dirname(__filename), '../../../testfiles/someModule.ren');
            const module = new Module(0, path, reduceProgram(ast));
            // set up imported module
            const importedPath = resolve(dirname(__filename), '../../../testfiles/index.ren');
            const importedModule = new Module(1, importedPath);
            importedModule.exports = {
                default: { kind: 'expr', valueName: '' },
                myFunc: { kind: 'func', valueName: '' },
                myType: { kind: 'type', valueName: '' },
            };
            // create type checker, add modules to it
            const tc = new TypeChecker();
            tc.modules = [module, importedModule];
            tc.moduleCache = { [path]: 0, [importedPath]: 1 };
            // process the imports
            tc.processImport(module, module.ast.imports[0]);
            tc.processImport(module, module.ast.imports[1]);
            // assert error
            expect(tc.errors.map(e => e.message)).to.eql([`A value with name "myFunc" is already declared [${path}:1:48]`]);
        });
    });

    describe('Type Declaration Processing', () => {
        it('should handle name clash between two types', () => {
            const module = mock(Module, {
                path: '/index.ren',
                types: { myType: { ast: mock(TypeDeclaration), func: mock(FunctionFunc) } }
            });
            const type = Object.assign(new TypeDeclaration(), {
                name: 'myType',
                locations: { name: loc(1, 1, 1, 1) }
            });
            const tc = new TypeChecker();
            tc.processType(module, type);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myType" is already declared [/index.ren:1:1]']);
        });

        it('should handle name clash between a type and function', () => {
            const module = mock(Module, {
                path: '/index.ren',
                types: {},
                functions: {
                    funcType: {
                        ast: mock(FunctionDeclaration, {
                            locations: { name: loc(1, 1, 1, 1) },
                        }),
                        func: mock(FunctionFunc),
                    },
                },
            });
            const type = Object.assign(new TypeDeclaration(), {
                name: 'funcType',
                locations: { name: loc(1, 2, 1, 2) },
            });
            const tc = new TypeChecker();
            tc.processType(module, type);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "funcType" is already declared [/index.ren:1:2]']);
            expect((module.types as any).funcType.ast).to.eql(type);
        });

        it('should add a type to a module', () => {
            const module = new Module(0, '', {} as Program);
            const type = Object.assign(new TypeDeclaration(), { name: 'myType' });
            const tc = new TypeChecker();
            tc.processType(module, type);
            expect(tc.errors).to.eql([]);
            expect((module.types as any).myType.ast).to.eql(type);
        });
    });

    describe('Function Declaration Processing', () => {
        it('should handle name clash between two functions', () => {
            const module = Object.assign(new Module(0, '/index.ren', {} as Program), {
                functions: { myFunc: {} },
            });
            const func = Object.assign(new FunctionDeclaration(), { name: 'myFunc', locations: { name: loc(1, 1, 1, 1) } });
            const tc = new TypeChecker();
            tc.processFunction(module, func);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myFunc" is already declared [/index.ren:1:1]']);
        });

        it('should handle name clash between a function and type', () => {
            const module = Object.assign(new Module(0, '/index.ren', {} as Program), {
                types: {
                    funcType: {
                        ast: Object.assign(new TypeDeclaration(), {
                            locations: { name: loc(1, 2, 1, 2) }
                        }),
                    },
                },
            });
            const func = Object.assign(new FunctionDeclaration(), { name: 'funcType', locations: { name: loc(1, 1, 1, 1) } });
            const tc = new TypeChecker();
            tc.processFunction(module, func);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "funcType" is already declared [/index.ren:1:2]']);
            expect((module.functions as any).funcType.ast).to.eql(func);
        });

        it('should add a function to a module', () => {
            const module = new Module(0, '', {} as Program);
            const func = Object.assign(new FunctionDeclaration(), { name: 'myFunc' });
            const tc = new TypeChecker();
            tc.processFunction(module, func);
            expect(tc.errors).to.eql([]);
            expect((module.functions as any).myFunc.ast).to.eql(func);
        });
    });

    describe('Export Processing', () => {
        it('should handle name clash between two exports', () => {
            const module = Object.assign(new Module(0, '/index.ren', {} as Program), {
                exports: { myExport: {} }
            });
            const exp = Object.assign(new ExportDeclaration(), { name: 'myExport', locations: { name: loc(1, 1, 1, 1) } });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['An export with name "myExport" is already declared [/index.ren:1:1]']);
        });

        it('should handle exported type', () => {
            const module = mock(Module, {
                exports: {},
                types: {},
                functions: {}
            });
            const exp = mock(ExportDeclaration, {
                name: 'myType',
                value: Object.assign(new TypeDeclaration(), { name: 'myType' })
            });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myType: { kind: 'type', valueName: 'myType' } });
            expect(module.types).to.eql({ myType: { ast: exp.value } });
        });

        it('should handle exported function', () => {
            const module = mock(Module, {
                exports: {},
                types: {},
                functions: {}
            });
            const exp = mock(ExportDeclaration, { name: 'myFunc', value: Object.assign(new FunctionDeclaration(), { name: 'myFunc' }) });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myFunc: { kind: 'func', valueName: 'myFunc' } });
            expect(module.functions).to.eql({ myFunc: { ast: exp.value } });
        });

        it('should handle name clash between two constants', () => {
            const module = mock(Module, {
                exports: {},
                functions: {},
                types: {},
                constants: { myConst: { ast: mock(ExportDeclaration), func: mock(FunctionFunc) } },
                path: '/index.ren'
            });
            const exp = mock(ExportDeclaration, { name: 'myConst', value: mock(IntegerLiteral), locations: { name: loc(1, 1, 1, 1) } });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myConst" is already declared [/index.ren:1:1]']);
        });

        it('should handle name clash between a constant and type', () => {
            const module = mock(Module, {
                exports: {},
                constants: {},
                functions: {},
                types: { myConst: { ast: mock(TypeDeclaration, { name: 'myConst', locations: { name: loc(1, 2, 1, 2) } }), func: mock(FunctionFunc) } },
                path: '/index.ren'
            });
            const exp = mock(ExportDeclaration, { name: 'myConst', value: mock(IntegerLiteral), locations: { name: loc(1, 1, 1, 1) } });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myConst" is already declared [/index.ren:1:2]']);
        });

        it('should handle name clash between a constant and function', () => {
            const module = mock(Module, {
                exports: {},
                constants: {},
                types: {},
                functions: { myConst: { ast: mock(FunctionDeclaration, { name: 'myConst', locations: { name: loc(1, 2, 1, 2) } }), func: mock(FunctionFunc) } },
                path: '/index.ren'
            });
            const exp = mock(ExportDeclaration, { name: 'myConst', value: mock(IntegerLiteral), locations: { name: loc(1, 1, 1, 1) } });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myConst" is already declared [/index.ren:1:2]']);
        });

        it('should handle exported constant', () => {
            const module = mock(Module, { exports: {}, constants: {}, types: {}, functions: {} });
            const exp = mock(ExportDeclaration, { name: 'myConst', value: mock(IntegerLiteral) });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myConst: { kind: 'expr', valueName: 'myConst' } });
            expect(module.constants).to.eql({ myConst: { ast: exp } });
        });

        it('should handle exported import', () => {
            const module = mock(Module, {
                exports: {},
                imports: {
                    myImport: { kind: 'expr', moduleId: 0, exportName: '', ast: mock(ImportDeclaration) }
                }
            });
            const exp = mock(ExportDeclaration, { name: 'myImport' });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myImport: { kind: 'expr', valueName: 'myImport' } });
        });

        it('should handle exported declared types', () => {
            const module = mock(Module, { exports: {}, imports: {}, types: { myType: { ast: mock(TypeDeclaration), func: mock(FunctionFunc) } } });
            const exp = mock(ExportDeclaration, { name: 'myType' });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myType: { kind: 'type', valueName: 'myType' } });
        });

        it('should handle exported declared function', () => {
            const module = mock(Module, { exports: {}, imports: {}, types: {}, functions: { myFunc: { ast: mock(FunctionDeclaration), func: mock(FunctionFunc) } } });
            const exp = mock(ExportDeclaration, { name: 'myFunc' });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors).to.eql([]);
            expect(module.exports).to.eql({ myFunc: { kind: 'func', valueName: 'myFunc' } });
        });

        it('should error for exporting an undefined value', () => {
            const module = mock(Module, { exports: {}, imports: {}, types: {}, functions: {}, path: '/index.ren' });
            const exp = mock(ExportDeclaration, { name: 'myValue', locations: { name: loc(1, 1, 1, 1) } });
            const tc = new TypeChecker();
            tc.processExport(module, exp);
            expect(tc.errors.map(e => e.message)).to.eql(['Value "myValue" is not defined [/index.ren:1:1]']);
        });
    });

    describe('Type Resolution', () => {
        it('should skip already resolved type', () => {
            const type = { ast: mock(TypeDeclaration, { type: new TAny() }), func: mock(FunctionFunc) };
            expect(new TypeChecker().resolveType(mock(Module), type)).to.eql(new TAny());
        });

        it('should error for circular dependency', () => {
            const module = mock(Module, { path: '/index.ren' });
            const decl = { resolving: true, ast: mock(TypeDeclaration, { locations: { self: loc(1, 1, 1, 1) } }), func: mock(FunctionFunc) };
            const tc = new TypeChecker();
            expect(tc.resolveType(module, decl)).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Cannot resolve type, circular dependency found [/index.ren:1:1]']);
        });

        it('should resolve type of function declaration', () => {
            const decl = { ast: new FunctionDeclaration(), func: mock(FunctionFunc) };
            const stub = sandbox.stub(decl.ast, 'visit').callsFake(() => decl.ast.type = new TAny());
            const tc = new TypeChecker();
            expect(tc.resolveType(mock(Module), decl)).to.eql(new TAny());
            sinon.assert.calledOnce(stub);
        });

        it('should resolve type of non-function declaration', () => {
            const decl = { ast: new TypeDeclaration(), resolving: false, func: mock(FunctionFunc) };
            const stub = sandbox.stub(decl.ast, 'visit').callsFake(() => {
                expect(decl.resolving).to.eql(true);
                decl.ast.type = new TAny();
            });
            const tc = new TypeChecker();
            expect(tc.resolveType(mock(Module), decl)).to.eql(new TAny());
            expect(decl.resolving).to.eql(false);
            sinon.assert.calledOnce(stub);
        });

        it('should retrieve a local, already resolved type', () => {
            const module = mock(Module, {
                types: {
                    myType: { ast: mock(TypeDeclaration, { type: new TAny() }), func: mock(FunctionFunc) }
                }
            });
            expect(new TypeChecker().getType(module, 'myType')).to.eql(new TAny());
        });

        it('should retrieve a recursive type', () => {
            const module = mock(Module, {
                types: {
                    myType: { resolving: true, ast: mock(TypeDeclaration), func: mock(FunctionFunc) }
                }
            });
            expect(new TypeChecker().getType(module, 'myType')).to.eql(new TRecursive(mock(TypeDeclaration)));
        });

        it('should resolve and retrieve a type', () => {
            const module = mock(Module, { types: { myType: { ast: new TypeDeclaration(), func: mock(FunctionFunc) } } });
            const stub = sandbox.stub(module.types.myType.ast, 'visit').callsFake(() => {
                module.types.myType.ast.type = new TAny();
            });
            expect(new TypeChecker().getType(module, 'myType')).to.eql(new TAny());
            sinon.assert.calledOnce(stub);
        });

        it('should retrieve an imported type', () => {
            const module = mock(Module, {
                types: { myType: { imported: true, ast: mock(TypeDeclaration), func: mock(FunctionFunc) } },
                imports: { myType: { moduleId: 1, exportName: 'default', kind: 'func', ast: mock(ImportDeclaration) } }
            });
            const importedModule = mock(Module, {
                exports: {
                    default: { kind: 'type', valueName: 'theType' }
                },
                types: { theType: { ast: mock(TypeDeclaration, { type: new TAny() }), func: mock(FunctionFunc) } }
            });
            const tc = new TypeChecker();
            tc.modules = [module, importedModule];
            expect(tc.getType(module, 'myType')).to.eql(new TAny());
        });

        it('should return null for non-existent value', () => {
            const module = mock(Module, { functions: {}, constants: {} });
            expect(new TypeChecker().getValueType(module, 'someName')).to.eql(null);
        });

        it('should retrieve the type of a local, already resolved value', () => {
            const module = mock(Module, { functions: {}, constants: { myValue: { ast: mock(ExportDeclaration, { type: new TAny() }), func: mock(FunctionFunc) } } });
            expect(new TypeChecker().getValueType(module, 'myValue')).to.eql(new TAny());
        });

        it('should resolve and retrieve a value\'s type', () => {
            const module = mock(Module, { functions: {}, constants: { myValue: { ast: new ExportDeclaration(), func: mock(FunctionFunc) } } });
            const stub = sandbox.stub(module.constants.myValue.ast, 'visit').callsFake(() => {
                module.constants.myValue.ast.type = new TAny();
            });
            expect(new TypeChecker().getValueType(module, 'myValue')).to.eql(new TAny());
            sinon.assert.calledOnce(stub);
        });

        it('should retrive the type of an imported value', () => {
            const module = mock(Module, {
                functions: {},
                constants: { myValue: { imported: true, ast: mock(ExportDeclaration), func: mock(FunctionFunc) } },
                imports: { myValue: { moduleId: 1, exportName: 'default', kind: 'expr', ast: mock(ImportDeclaration) } }
            });
            const importedModule = mock(Module, {
                exports: { default: { kind: 'expr', valueName: 'theValue' } },
                functions: {},
                constants: { theValue: { ast: mock(ExportDeclaration, { type: new TAny() }), func: mock(FunctionFunc) } }
            });
            const tc = new TypeChecker();
            tc.modules = [module, importedModule];
            expect(tc.getValueType(module, 'myValue')).to.eql(new TAny());
        });
    });

    describe('Top-level tests', () => {
        it('should perform semantic analysis on a program', () => {
            const path = resolve(dirname(__filename), '../../../testfiles/test.ren');
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
            const path = resolve(dirname(__filename), '../../../testfiles/error.ren');
            const contents = readFile(path).toString();
            const parsed = parse(contents);
            const tc = new TypeChecker();
            expect(() => tc.check(parsed, path)).to.throw(`Value "noFunc" is not defined [${path}:1:22]`);
        });
    });
});
