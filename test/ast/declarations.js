import { expect } from 'chai';

import * as decl from '../../src/ast/declarations';
import { Token } from '../../src/parser/Tokenizer';
import { TInteger, TFunction, TUnknown } from '../../src/typecheck/types';


const int = new TInteger(32, true);
const loc = { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };

function getDummyNode(value = {}) {
    return { reduce: () => (value) };
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
                declarations: [getDummyNode(new decl.FunctionDeclaration()), getDummyNode(new decl.TypeDeclaration), getDummyNode(new decl.ExportDeclaration)],
            });
            expect(program.reduce()).to.eql(new decl.Program({
                imports: [{}],
                functions: [{}],
                types: [{}],
                exports: [{}],
            }));
        });
    });

    describe('ImportDeclaration', () => {
        it('should reduce a default import', () => {
            const imp = new decl.ImportDeclaration({
                moduleNameToken: new Token('STRING', 1, 1, '"myModule"', 'myModule'),
                imports: new decl.ImportList({ defaultImportNameToken: new Token('IDENT', 1, 11, 'myDefault') }),
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
                imports: new decl.ImportList({
                    namedImports: new decl.NamedImports({
                        importComponents: [
                            new decl.ImportComponent({
                                importWithAlias: new decl.ImportWithAlias({
                                    importNameToken: new Token('IDENT', 1, 11, 'myName'),
                                    importAliasToken: new Token('IDENT', 1, 17, 'myAlias'),
                                }),
                            }),
                            new decl.ImportComponent({
                                importNameToken: new Token('IDENT', 1, 24, 'myNameAlias'),
                            }),
                        ]
                    })
                }),
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
                            typeNode: getDummyNode(),
                            nameToken: new Token('IDENT', 1, 7, 'param1'),
                        }),
                        new decl.Param({
                            typeNode: getDummyNode(),
                            nameToken: new Token('IDENT', 1, 13, 'param2'),
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

        it('should reduce a function declaration with type parameters', () => {
            const func = new decl.FunctionDeclaration({
                returnType: getDummyNode(),
                functionNameToken: new Token('IDENT', 1, 1, 'myFunc'),
                typeParamList: new decl.TypeParamList({
                    typeParams: [
                        new decl.TypeParam({ nameToken: new Token('IDENT', 1, 7, 'A') }),
                        new decl.TypeParam({ nameToken: new Token('IDENT', 1, 8, 'B') }),
                    ],
                }),
                params: new decl.ParameterList({ params: [] }),
                functionBody: getDummyNode(),
            });
            expect(func.reduce()).to.eql(new decl.FunctionDeclaration({
                name: 'myFunc',
                returnType: {},
                typeParams: [
                    new decl.TypeParam({ name: 'A', locations: { name: { ...loc, startColumn: 7, endColumn: 7 }, self: { ...loc, startColumn: 7, endColumn: 7 } } }),
                    new decl.TypeParam({ name: 'B', locations: { name: { ...loc, startColumn: 8, endColumn: 8 }, self: { ...loc, startColumn: 8, endColumn: 8 } } }),
                ],
                params: [],
                body: {},
                locations: { name: { ...loc, endColumn: 6 } },
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
                typeNode: getDummyNode(),
            });
            expect(type.reduce()).to.eql(new decl.TypeDeclaration({
                name: 'myType',
                typeNode: {},
                locations: { name: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 6 } },
            }));
        });

        it('should reduce a type declaration with type parameters', () => {
            const func = new decl.TypeDeclaration({
                typeNameToken: new Token('IDENT', 1, 1, 'myType'),
                typeParamList: new decl.TypeParamList({
                    typeParams: [
                        new decl.TypeParam({ nameToken: new Token('IDENT', 1, 7, 'A') }),
                        new decl.TypeParam({ nameToken: new Token('IDENT', 1, 8, 'B') }),
                    ],
                }),
                typeNode: getDummyNode(),
            });
            expect(func.reduce()).to.eql(new decl.TypeDeclaration({
                name: 'myType',
                typeParams: [
                    new decl.TypeParam({ name: 'A', locations: { name: { ...loc, startColumn: 7, endColumn: 7 }, self: { ...loc, startColumn: 7, endColumn: 7 } } }),
                    new decl.TypeParam({ name: 'B', locations: { name: { ...loc, startColumn: 8, endColumn: 8 }, self: { ...loc, startColumn: 8, endColumn: 8 } } }),
                ],
                typeNode: {},
                locations: { name: { ...loc, endColumn: 6 } },
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
                exportName: new decl.ExportName({ defaultToken: new Token('DEFAULT', 1, 1, 'default') }),
                exportValue: getDummyNode(),
            });
            expect(exp.reduce()).to.eql(new decl.ExportDeclaration({
                name: 'default',
                value: {},
                locations: { name: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 7 } },
            }));
        });

        it('should reduce named exports', () => {
            const exp = new decl.ExportDeclaration({
                exportName:  new decl.ExportName({
                    namedExport: new decl.NamedExport({ exportNameToken: new Token('IDENT', 1, 1, 'myExport') }),
                }),
                exportValue: getDummyNode(),
            });
            expect(exp.reduce()).to.eql(new decl.ExportDeclaration({
                name: 'myExport',
                value: {},
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

    describe('TypeParam', () => {
        it('should reduce type param with variance and constraints', () => {
            let p = new decl.TypeParam({
                varianceOp: new decl.VarianceOp({ covariantToken: new Token('OPER', 1, 1, '+') }),
                nameToken: new Token('IDENT', 1, 2, 'A'),
            });
            expect(p.reduce()).to.eql(new decl.TypeParam({
                varianceOp: '+',
                name: 'A',
                locations: {
                    name: { ...loc, startColumn: 2, endColumn: 2 },
                    variance: loc,
                    self: { ...loc, endColumn: 2 },
                },
            }));
            p = new decl.TypeParam({
                nameToken: new Token('IDENT', 1, 1, 'A'),
                typeConstraint: new decl.TypeConstraint({
                    constraintOp: new decl.ConstraintOp({ assignableToToken: new Token('COLON', 1, 2, ':') }),
                    constraintType: getDummyNode({ locations: { self: { ...loc, startColumn: 3, endColumn: 3 } } }),
                }),
            });
            expect(p.reduce()).to.eql(new decl.TypeParam({
                name: 'A',
                typeConstraint: { op: ':', type: { locations: { self: { ...loc, startColumn: 3, endColumn: 3 } } } },
                locations: {
                    name: loc,
                    constraint: { ...loc, startColumn: 2, endColumn: 3 },
                    self: { ...loc, endColumn: 3 },
                },
            }));
            p = new decl.TypeParam({
                varianceOp: new decl.VarianceOp({ contravariantToken: new Token('OPER', 1, 1, '-') }),
                nameToken: new Token('IDENT', 1, 2, 'A'),
                typeConstraint: new decl.TypeConstraint({
                    constraintOp: new decl.ConstraintOp({ assignableFromToken: new Token('ASS_FROM', 1, 3, '-:') }),
                    constraintType: getDummyNode({ locations: { self: { ...loc, startColumn: 5, endColumn: 5 } } }),
                }),
            })
            expect(p.reduce()).to.eql(new decl.TypeParam({
                varianceOp: '-',
                name: 'A',
                typeConstraint: { op: '-:', type: { locations: { self: { ...loc, startColumn: 5, endColumn: 5 } } } },
                locations: {
                    name: { ...loc, startColumn: 2, endColumn: 2 },
                    variance: loc,
                    constraint: { ...loc, startColumn: 3, endColumn: 5 },
                    self: { ...loc, endColumn: 5 },
                },
            }));
        });
    });
});
