import { expect } from 'chai';

import * as decl from '../../src/ast/declarations';
import { Token } from '../../src/parser/Tokenizer';
import { TInteger, TFunction, TUnknown } from '../../src/typecheck/types';


const int = new TInteger(32, true);
const loc = { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };

function getDummyNode() {
    return { reduce: () => ({}) };
}

function getDummyReducedNode(type, locations = {}) {
    return {
        locations,
        resolveType: () => type,
    };
}

describe('Declaration Nodes', () => {
    describe('Program', () => {
        it('should reduce all declarations', () => {
            const program = new decl.Program({
                imports: [getDummyNode()],
                types: [getDummyNode()],
                functions: [getDummyNode()],
                exports: [getDummyNode()],
            });
            expect(program.reduce()).to.eql(new decl.Program({
                imports: [{}],
                types: [{}],
                functions: [{}],
                exports: [{}],
            }));
        });
    });

    describe('ImportDeclaration', () => {
        it('should reduce a default import', () => {
            const imp = new decl.ImportDeclaration({
                moduleNameToken: new Token('STRING', 1, 1, '"myModule"', 'myModule'),
                defaultImportNameToken: new Token('IDENT', 1, 11, 'myDefault'),
                defaultImport: true,
            });
            expect(imp.reduce()).to.eql(new decl.ImportDeclaration({
                moduleName: 'myModule',
                importNames: {
                    default: 'myDefault',
                },
                locations: {
                    moduleName: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
                    import_default: { startLine: 1, startColumn: 11, endLine: 1, endColumn: 19 },
                    importName_default: { startLine: 1, startColumn: 11, endLine: 1, endColumn: 19 },
                    importAlias_default: { startLine: 1, startColumn: 11, endLine: 1, endColumn: 19 },
                },
            }));
        });

        it('should reduce named imports', () => {
            const imp = new decl.ImportDeclaration({
                moduleNameToken: new Token('STRING', 1, 1, '"myModule"', 'myModule'),
                defaultImport: false,
                importComponents: [
                    new decl.ImportComponent({
                        importNameToken: new Token('IDENT', 1, 11, 'myName'),
                        importAliasToken: new Token('IDENT', 1, 17, 'myAlias'),
                    }),
                    new decl.ImportComponent({
                        importNameToken: new Token('IDENT', 1, 24, 'myNameAlias'),
                    }),
                ],
            });
            expect(imp.reduce()).to.eql(new decl.ImportDeclaration({
                moduleName: 'myModule',
                importNames: {
                    myName: 'myAlias',
                    myNameAlias: 'myNameAlias',
                },
                locations: {
                    moduleName: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
                    import_myName: { startLine: 1, startColumn: 11, endLine: 1, endColumn: 23 },
                    importName_myName: { startLine: 1, startColumn: 11, endLine: 1, endColumn: 16 },
                    importAlias_myName: { startLine: 1, startColumn: 17, endLine: 1, endColumn: 23 },
                    import_myNameAlias: { startLine: 1, startColumn: 24, endLine: 1, endColumn: 34 },
                    importName_myNameAlias: { startLine: 1, startColumn: 24, endLine: 1, endColumn: 34 },
                    importAlias_myNameAlias: { startLine: 1, startColumn: 24, endLine: 1, endColumn: 34 },
                },
            }));
        });
    });

    describe('FunctionDeclaration', () => {
        it('should reduce a function declaration', () => {
            const func = new decl.FunctionDeclaration({
                functionNameToken: new Token('IDENT', 1, 1, 'myFunc'),
                returnType: getDummyNode(),
                params: new decl.ParameterList({
                    params: [
                        new decl.Param({
                            type: getDummyNode(),
                            identifierToken: new Token('IDENT', 1, 7, 'param1'),
                        }),
                        new decl.Param({
                            type: getDummyNode(),
                            identifierToken: new Token('IDENT', 1, 13, 'param2'),
                        }),
                    ],
                }),
                functionBody: getDummyNode(),
            });
            expect(func.reduce()).to.eql(new decl.FunctionDeclaration({
                name: 'myFunc',
                returnType: {},
                params: [
                    new decl.Param({
                        typeNode: {},
                        name: 'param1',
                        locations: { name: { startLine: 1, startColumn: 7, endLine: 1, endColumn: 12 } },
                    }),
                    new decl.Param({
                        typeNode: {},
                        name: 'param2',
                        locations: { name: { startLine: 1, startColumn: 13, endLine: 1, endColumn: 18 } },
                    }),
                ],
                body: {},
                locations: {
                    name: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 6 },
                },
            }));
        });

        it('should resolve the type of a function', () => {
            const func = new decl.FunctionDeclaration({
                name: 'myFunc',
                returnType: getDummyReducedNode(int),
                params: [
                    getDummyReducedNode(int),
                    getDummyReducedNode(int),
                ],
                body: getDummyReducedNode(int),
            });
            expect(func.resolveType({}, {})).to.eql(new TFunction([int, int], int));
        });

        it('should resolve a function to unknown for an unknown param type', () => {
            const func = new decl.FunctionDeclaration({
                name: 'myFunc',
                returnType: getDummyReducedNode(int),
                params: [
                    getDummyReducedNode(new TUnknown()),
                    getDummyReducedNode(int),
                ],
                body: getDummyReducedNode(int),
            });
            expect(func.resolveType({}, {})).to.eql(new TUnknown());
        });

        it('should resolve a function to unknown for an unknown return type', () => {
            const func = new decl.FunctionDeclaration({
                name: 'myFunc',
                returnType: getDummyReducedNode(new TUnknown()),
                params: [
                    getDummyReducedNode(int),
                    getDummyReducedNode(int),
                ],
                body: getDummyReducedNode(int),
            });
            expect(func.resolveType({}, {})).to.eql(new TUnknown());
        });

        it('should have an error in the case of a type mismatch between return type and body', () => {
            const func = new decl.FunctionDeclaration({
                name: 'myFunc',
                returnType: getDummyReducedNode(int, { self: loc }),
                params: [
                    getDummyReducedNode(int),
                    getDummyReducedNode(int),
                ],
                body: getDummyReducedNode(new TInteger(64, true)),
            });
            const errors = [];
            func.resolveType({ errors }, { path: '/index.ren' });
            expect(errors.length).to.eql(1);
            expect(errors[0].message).to.eql('Type "signed 64-bit integer" is not assignable to type "signed 32-bit integer" [/index.ren:1:1]');
        });

        it('should resolve a parameter type from the type node', () => {
            const param = new decl.Param({
                typeNode: getDummyReducedNode(int),
                name: 'param1',
            });
            expect(param.resolveType({}, {})).to.eql(int);
        });
    });

    describe('TypeDeclaration', () => {
        it('should reduce a type declaration', () => {
            const type = new decl.TypeDeclaration({
                typeNameToken: new Token('IDENT', 1, 1, 'myType'),
                type: getDummyNode(),
            });
            expect(type.reduce()).to.eql(new decl.TypeDeclaration({
                name: 'myType',
                typeNode: {},
                locations: { name: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 6 } },
            }));
        });

        it('should resolve a type declaration from the type node', () => {
            const type = new decl.TypeDeclaration({
                typeNode: getDummyReducedNode(int),
                name: 'myType',
            });
            expect(type.resolveType({}, {})).to.eql(int);
        });
    });

    describe('ExportDeclaration', () => {
        it('should reduce default exports', () => {
            const exp = new decl.ExportDeclaration({
                defaultToken: new Token('DEFAULT', 1, 1, 'default'),
                exportedValue: getDummyNode(),
            });
            expect(exp.reduce()).to.eql(new decl.ExportDeclaration({
                name: 'default',
                value: {},
                locations: { name: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 7 } },
            }));
        });

        it('should reduce named exports', () => {
            const exp = new decl.ExportDeclaration({
                exportName: new Token('IDENT', 1, 1, 'myExport'),
                exportedValue: getDummyNode(),
            });
            expect(exp.reduce()).to.eql(new decl.ExportDeclaration({
                name: 'myExport',
                value: {},
                locations: { name: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 8 } },
            }));
        });

        it('should reduce already declared named exports', () => {
            const exp = new decl.ExportDeclaration({
                exportName: new Token('IDENT', 1, 1, 'myExport'),
            });
            expect(exp.reduce()).to.eql(new decl.ExportDeclaration({
                name: 'myExport',
                locations: { name: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 8 } },
            }));
        });

        it('should resolve an export from the value', () => {
            const exp = new decl.ExportDeclaration({
                name: 'myExport',
                value: getDummyReducedNode(int),
            });
            expect(exp.resolveType({}, {})).to.eql(int);
        });
    });
});
