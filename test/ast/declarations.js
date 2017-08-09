import { expect } from 'chai';

import * as decl from '../../src/ast/declarations';
import { Token } from '../../src/parser/Tokenizer';


function getDummyDeclarationNode() {
    return { reduce: () => ({}) };
}

describe('Declaration Nodes', () => {
    describe('Program', () => {
        it('should reduce all declarations', () => {
            const program = new decl.Program({
                imports: [getDummyDeclarationNode()],
                types: [getDummyDeclarationNode()],
                functions: [getDummyDeclarationNode()],
                exports: [getDummyDeclarationNode()],
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
                functionNameToken: new Token('IDENT', 1, 1, 'myFunc'), // TODO: you were here
            });
        });
    });
});
