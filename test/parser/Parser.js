import { expect } from 'chai';

import * as pars from '../../src/parser/Parser';
import { Parser } from '../../src/parser/parser-control';


describe('parser', () => {
    describe('parsing declarations', () => {
        it('should parse ImportWithAlias', () => {
            const parsed = pars.acceptImportWithAlias(new Parser('myImport as myAlias'));
            expect(parsed.toTree()).to.eql({
                type: 'ImportWithAlias',
                children: [
                    { type: 'IDENT', image: 'myImport' },
                    { type: 'AS', image: 'as' },
                    { type: 'IDENT', image: 'myAlias' },
                ],
            });
        });

        it('should parse ImportComponent', () => {
            let parsed = pars.acceptImportComponent(new Parser('myImport as myAlias'));
            expect(parsed.toTree()).to.eql({
                type: 'ImportComponent',
                children: [{
                    type: 'ImportWithAlias',
                    children: [{ type: 'IDENT', image: 'myImport' }, { type: 'AS', image: 'as' }, { type: 'IDENT', image: 'myAlias' }],
                }],
            });
            parsed = pars.acceptImportComponent(new Parser('myImport'));
            expect(parsed.toTree()).to.eql({
                type: 'ImportComponent',
                children: [{ type: 'IDENT', image: 'myImport' }],
            });
        });

        it('should parse NamedImports', () => {
            const parsed = pars.acceptNamedImports(new Parser('{ myImport, myImport as myAlias }'));
            expect(parsed.toTree()).to.eql({
                type: 'NamedImports',
                children: [
                    { type: 'LBRACE', image: '{' },
                    {
                        type: 'ImportComponent',
                        children: [{ type: 'IDENT', image: 'myImport' }],
                    },
                    { type: 'COMMA', image: ',' },
                    {
                        type: 'ImportComponent',
                        children: [{
                            type: 'ImportWithAlias',
                            children: [
                                { type: 'IDENT', image: 'myImport' },
                                { type: 'AS', image: 'as' },
                                { type: 'IDENT', image: 'myAlias' },
                            ],
                        }],
                    },
                    { type: 'RBRACE', image: '}' },
                ],
            });
        });

        it('should parse ImportList', () => {
            let parsed = pars.acceptImportList(new Parser('myDefault'));
            expect(parsed.toTree()).to.eql({
                type: 'ImportList',
                children: [{ type: 'IDENT', image: 'myDefault' }],
            });
            parsed = pars.acceptImportList(new Parser('{ myImport }'));
            expect(parsed.toTree()).to.eql({
                type: 'ImportList',
                children: [{
                    type: 'NamedImports',
                    children: [
                        { type: 'LBRACE', image: '{' },
                        { type: 'ImportComponent', children: [{ type: 'IDENT', image: 'myImport' }] },
                        { type: 'RBRACE', image: '}' },
                    ],
                }],
            });
        });

        it('should parse ImportDeclaration', () => {
            const parsed = pars.acceptImportDeclaration(new Parser('import from "module": myDefault'));
            expect(parsed.toTree()).to.eql({
                type: 'ImportDeclaration',
                children: [
                    { type: 'IMPORT', image: 'import' },
                    { type: 'FROM', image: 'from' },
                    { type: 'STRING_LITERAL', image: '"module"' },
                    { type: 'COLON', image: ':' },
                    { type: 'ImportList', children: [{ type: 'IDENT', image: 'myDefault' }] },
                ],
            });
        });
    });

    describe('parsing types', () => {
        it('should parse Type', () => {
            expect(pars.acceptType(new Parser('u8')).toTree()).to.eql({ type: 'Type', children: [{ type: 'U8', image: 'u8' }] });
            expect(pars.acceptType(new Parser('i8')).toTree()).to.eql({ type: 'Type', children: [{ type: 'I8', image: 'i8' }] });
            expect(pars.acceptType(new Parser('byte')).toTree()).to.eql({ type: 'Type', children: [{ type: 'BYTE', image: 'byte' }] });
            expect(pars.acceptType(new Parser('u16')).toTree()).to.eql({ type: 'Type', children: [{ type: 'U16', image: 'u16' }] });
            expect(pars.acceptType(new Parser('i16')).toTree()).to.eql({ type: 'Type', children: [{ type: 'I16', image: 'i16' }] });
            expect(pars.acceptType(new Parser('short')).toTree()).to.eql({ type: 'Type', children: [{ type: 'SHORT', image: 'short' }] });
            expect(pars.acceptType(new Parser('u32')).toTree()).to.eql({ type: 'Type', children: [{ type: 'U32', image: 'u32' }] });
            expect(pars.acceptType(new Parser('i32')).toTree()).to.eql({ type: 'Type', children: [{ type: 'I32', image: 'i32' }] });
            expect(pars.acceptType(new Parser('integer')).toTree()).to.eql({ type: 'Type', children: [{ type: 'INTEGER', image: 'integer' }] });
            expect(pars.acceptType(new Parser('u64')).toTree()).to.eql({ type: 'Type', children: [{ type: 'U64', image: 'u64' }] });
            expect(pars.acceptType(new Parser('i64')).toTree()).to.eql({ type: 'Type', children: [{ type: 'I64', image: 'i64' }] });
            expect(pars.acceptType(new Parser('long')).toTree()).to.eql({ type: 'Type', children: [{ type: 'LONG', image: 'long' }] });
            expect(pars.acceptType(new Parser('int')).toTree()).to.eql({ type: 'Type', children: [{ type: 'INT', image: 'int' }] });
            expect(pars.acceptType(new Parser('f32')).toTree()).to.eql({ type: 'Type', children: [{ type: 'F32', image: 'f32' }] });
            expect(pars.acceptType(new Parser('float')).toTree()).to.eql({ type: 'Type', children: [{ type: 'FLOAT', image: 'float' }] });
            expect(pars.acceptType(new Parser('f64')).toTree()).to.eql({ type: 'Type', children: [{ type: 'F64', image: 'f64' }] });
            expect(pars.acceptType(new Parser('double')).toTree()).to.eql({ type: 'Type', children: [{ type: 'DOUBLE', image: 'double' }] });
            expect(pars.acceptType(new Parser('char')).toTree()).to.eql({ type: 'Type', children: [{ type: 'CHAR', image: 'char' }] });
            expect(pars.acceptType(new Parser('string')).toTree()).to.eql({ type: 'Type', children: [{ type: 'STRING', image: 'string' }] });
            expect(pars.acceptType(new Parser('bool')).toTree()).to.eql({ type: 'Type', children: [{ type: 'BOOL', image: 'bool' }] });
            expect(pars.acceptType(new Parser('void')).toTree()).to.eql({ type: 'Type', children: [{ type: 'VOID', image: 'void' }] });
            expect(pars.acceptType(new Parser('any')).toTree()).to.eql({ type: 'Type', children: [{ type: 'ANY', image: 'any' }] });
            expect(pars.acceptType(new Parser('{}')).toTree()).to.eql({ type: 'Type', children: [{ type: 'StructType', children: [{ type: 'LBRACE', image: '{' }, { type: 'RBRACE', image: '}' }] }] });
            expect(pars.acceptType(new Parser('() => void')).toTree()).to.eql({
                type: 'Type',
                children: [{
                    type: 'FunctionType',
                    children: [
                        { type: 'LPAREN', image: '(' },
                        { type: 'RPAREN', image: ')' },
                        { type: 'FAT_ARROW', image: '=>' },
                        { type: 'Type', children: [{ type: 'VOID', image: 'void' }] },
                    ],
                }],
            });
            expect(pars.acceptType(new Parser('(int)', true)).toTree()).to.eql({
                type: 'Type',
                children: [{
                    type: 'ParenthesizedType',
                    children: [
                        { type: 'LPAREN', image: '(' },
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'RPAREN', image: ')' },
                    ],
                }],
            });
            // TODO: tuple
            // TODO: generic
            // TODO: ident
            expect(pars.acceptType(new Parser('int[]')).toTree()).to.eql({
                type: 'Type',
                children: [{
                    type: 'ArrayType',
                    children: [
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'LBRACK', image: '[' },
                        { type: 'RBRACK', image: ']' },
                    ],
                }],
            });
            // TODO: union
        });

        it('should parse Field', () => {
            const parsed = pars.acceptField(new Parser('int i'));
            expect(parsed.toTree()).to.eql({
                type: 'Field',
                children: [
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'IDENT', image: 'i' },
                ],
            });
        });

        it('should parse StructType', () => {
            const parsed = pars.acceptStructType(new Parser('{ int i; int j }'));
            expect(parsed.toTree()).to.eql({
                type: 'StructType',
                children: [
                    { type: 'LBRACE', image: '{' },
                    {
                        type: 'Field',
                        children: [{ type: 'Type', children: [{ type: 'INT', image: 'int' }] }, { type: 'IDENT', image: 'i' }],
                    },
                    {
                        type: 'Field',
                        children: [{ type: 'Type', children: [{ type: 'INT', image: 'int' }] }, { type: 'IDENT', image: 'j' }],
                    },
                    { type: 'RBRACE', image: '}' },
                ],
            });
        });

        it('should parse FunctionType', () => {
            const parsed = pars.acceptFunctionType(new Parser('(int, int) => int'));
            expect(parsed.toTree()).to.eql({
                type: 'FunctionType',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'RPAREN', image: ')' },
                    { type: 'FAT_ARROW', image: '=>' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                ],
            });
        });
    });
});

/*const parser = new Parser();

describe('Parser', () => {
    describe('base/util functions', () => {
        it('should throw an error with an unsuccessful parse', () => {
            const p = new Parser();
            p.tokenizer = new LookaheadIterator(new Tokenizer('int'));
            try {
                p.parseNextToken(() => false, 'failure');
            } catch (err) {
                const { message, startLine, startColumn, endLine, endColumn } = err;
                expect({ message, startLine, startColumn, endLine, endColumn })
                    .to.eql({ message: 'Failure (Line 1, Column 1)', startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 });
            }
        });

        it('should enforce token type', () => {
            const p = new Parser();
            p.tokenizer = new Tokenizer('int');
            expect(p.expectNextToken('INT', 'fail').image).to.eql('int');

            p.tokenizer = new Tokenizer('int');
            try {
                p.expectNextToken('BOOL', 'not bool');
            } catch (err) {
                const { message, startLine, startColumn, endLine, endColumn } = err;
                expect({ message, startLine, startColumn, endLine, endColumn })
                    .to.eql({ message: 'Not bool (Line 1, Column 1)', startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 });
            }

            p.tokenizer = new Tokenizer('int');
            try {
                p.expectNextToken('BOOL', tok => `'${tok.image}' is not a bool`);
            } catch (err) {
                const { message, startLine, startColumn, endLine, endColumn } = err;
                expect({ message, startLine, startColumn, endLine, endColumn })
                    .to.eql({ message: "'int' is not a bool (Line 1, Column 1)", startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 });
            }

            p.tokenizer = new Tokenizer('int');
            expect(p.expectNextToken('BOOL')).to.eql(false);
        });

        it('should enforce a new line', () => {
            const p = new Parser();
            expect(p.enforceNewLine({ hasNewLine: true }, 'fail')).to.eql(undefined);

            try {
                p.enforceNewLine({ line: 1, column: 1, image: 'hello' }, 'fail');
            } catch (err) {
                const { message, startLine, startColumn, endLine, endColumn } = err;
                expect({ message, startLine, startColumn, endLine, endColumn })
                    .to.eql({ message: 'Fail (Line 1, Column 5)', startLine: 1, startColumn: 5, endLine: 1, endColumn: 5 });
            }
        });
    });

    describe('parsing declarations', () => {
        it('should throw an error for import declarations after other declarations', () => {
            expect(() => parser.parse('export a; import from "": b')).to.throw('Imports must occur before any declarations (Line 1, Column 11)');
        });

        it('should throw an error for an invalid import', () => {
            expect(() => parser.parse('import from "" break')).to.throw('Imports must be of the form `import from "<module>": <identifier>` or `import from "<module>" { <identifier>, ... }` or `import from "<module>" { <identifier> as <identifier>, ... }` (Line 1, Column 16)');
        });

        it('should throw an error for an invalid import component', () => {
            expect(() => parser.parse('import from "" { 1 }')).to.throw('Imports must be of the form `import from "<module>": <identifier>` or `import from "<module>" { <identifier>, ... }` or `import from "<module>" { <identifier> as <identifier>, ... }` (Line 1, Column 18)');
        });

        it('should parse function declarations', () => {
            const sourceString = 'func int getInt() => 1';
            const parsed = parser.parse(sourceString);
            expect(parsed.toTree()).to.eql({
                type: 'Program',
                children: [{
                    type: 'FunctionDeclaration',
                    children: [
                        { type: 'FUNC', image: 'func' },
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'IDENT', image: 'getInt' },
                        {
                            type: 'ParameterList',
                            children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }],
                        },
                        { type: 'FAT_ARROW', image: '=>' },
                        {
                            type: 'Expression',
                            children: [{ type: 'INTEGER_LITERAL', image: '1' }],
                        },
                    ],
                }, { type: 'EOF', image: null }],
            });
        });

        it('should parse function declarations with parameters', () => {
            const parsed = parser.parse('func int add(int a, int b) => a + b');
            expect(parsed.toTree()).to.eql({
                type: 'Program',
                children: [{
                    type: 'FunctionDeclaration',
                    children: [
                        { type: 'FUNC', image: 'func' },
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'IDENT', image: 'add' },
                        {
                            type: 'ParameterList',
                            children: [
                                { type: 'LPAREN', image: '(' },
                                {
                                    type: 'Param',
                                    children: [
                                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                                        { type: 'IDENT', image: 'a' },
                                    ],
                                },
                                { type: 'COMMA', image: ',' },
                                {
                                    type: 'Param',
                                    children: [
                                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                                        { type: 'IDENT', image: 'b' },
                                    ],
                                },
                                { type: 'RPAREN', image: ')' },
                            ],
                        },
                        { type: 'FAT_ARROW', image: '=>' },
                        {
                            type: 'Expression',
                            children: [{
                                type: 'BinaryExpression',
                                children: [
                                    { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                                    { type: 'OPER', image: '+' },
                                    { type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] },
                                ],
                            }],
                        },
                    ],
                }, { type: 'EOF', image: null }],
            });
        });

        it('should throw an error for an invalid function body', () => {
            expect(() => parser.parse('func int fun() => type')).to.throw('Invalid function body (Line 1, Column 19)');
        });

        it('should throw an error for an inavlid function parameter list', () => {
            expect(() => parser.parse('func int fun => 1')).to.throw('Invalid parameter list (Line 1, Column 14)');
        });

        it('should throw an error for an inavlid function parameter', () => {
            expect(() => parser.parse('func int fun(1 a) => 1')).to.throw('Invalid parameter type (Line 1, Column 14)');
        });

        it('should parse type declarations', () => {
            const sourceString = 'type b = bool';
            const parsed = parser.parse(sourceString);
            expect(parsed.toTree()).to.eql({
                type: 'Program',
                children: [{
                    type: 'TypeDeclaration',
                    children: [
                        { type: 'TYPE', image: 'type' },
                        { type: 'IDENT', image: 'b' },
                        { type: 'EQUALS', image: '=' },
                        {
                            type: 'Type',
                            children: [{ type: 'BOOL', image: 'bool' }],
                        },
                    ],
                }, { type: 'EOF', image: null }],
            });
        });

        it('should parse default exports', () => {
            const sourceString = 'export default 1';
            const parsed = parser.parse(sourceString);
            expect(parsed.toTree()).to.eql({
                type: 'Program',
                children: [{
                    type: 'ExportDeclaration',
                    children: [
                        { type: 'EXPORT', image: 'export' },
                        { type: 'DEFAULT', image: 'default' },
                        {
                            type: 'Expression',
                            children: [{ type: 'INTEGER_LITERAL', image: '1' }],
                        },
                    ],
                }, { type: 'EOF', image: null }],
            });
        });

        it('should parse named exports', () => {
            const sourceString = 'export one = 1';
            const parsed = parser.parse(sourceString);
            expect(parsed.toTree()).to.eql({
                type: 'Program',
                children: [{
                    type: 'ExportDeclaration',
                    children: [
                        { type: 'EXPORT', image: 'export' },
                        { type: 'IDENT', image: 'one' },
                        { type: 'EQUALS', image: '=' },
                        {
                            type: 'Expression',
                            children: [{ type: 'INTEGER_LITERAL', image: '1' }],
                        },
                    ],
                }, { type: 'EOF', image: null }],
            });
        });

        it('should parse exports of already declared names', () => {
            const sourceString = 'export one';
            const parsed = parser.parse(sourceString);
            expect(parsed.toTree()).to.eql({
                type: 'Program',
                children: [{
                    type: 'ExportDeclaration',
                    children: [
                        { type: 'EXPORT', image: 'export' },
                        { type: 'IDENT', image: 'one' },
                    ],
                }, { type: 'EOF', image: null }],
            });
        });

        it('should throw an error for an invalid export value', () => {
            expect(() => parser.parse('export default break')).to.throw('Invalid default export value; must be function, type, or expression (Line 1, Column 16)');
            expect(() => parser.parse('export a = break')).to.throw('Invalid named export value; must be function, type, or expression (Line 1, Column 12)');
        });

        it('should throw an error for an invalid export declaration', () => {
            expect(() => parser.parse('export break')).to.throw('Invalid export declaration; must be of the form `export default <type|function|expression>` or `export <name> = <type|function|expression>` (Line 1, Column 8)');
        });

        it('should throw an error for an invalid declaration', () => {
            expect(() => parser.parse('break')).to.throw("Expected import, export, or declaration, found 'break' (Line 1, Column 1)");
        });

        it('should throw an error for an empty file', () => {
            expect(() => parser.parse('')).to.throw('Empty file (Line 1, Column 1)');
        });
    });

    describe('parsing types', () => {
        it('should parse user-defined types', () => {
            const parsed = parser.parse('type t = myType');
            const type = parsed.toTree().children[0].children[3];
            expect(type).to.eql({ type: 'Type', children: [{ type: 'IDENT', image: 'myType' }] });
        });

        it('should parse parameterless function types', () => {
            const parsed = parser.parse('type t = () => void');
            const type = parsed.toTree().children[0].children[3];
            expect(type).to.eql({
                type: 'Type',
                children: [{
                    type: 'FunctionType',
                    children: [
                        { type: 'LPAREN', image: '(' },
                        { type: 'RPAREN', image: ')' },
                        { type: 'FAT_ARROW', image: '=>' },
                        { type: 'Type', children: [{ type: 'VOID', image: 'void' }] },
                    ],
                }],
            });
        });

        it('should parse tuple types', () => {
            const parsed = parser.parse('type t = (int, string, myType)');
            const type = parsed.toTree().children[0].children[3];
            expect(type).to.eql({
                type: 'Type',
                children: [{
                    type: 'TupleType',
                    children: [
                        { type: 'LPAREN', image: '(' },
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'Type', children: [{ type: 'STRING', image: 'string' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'Type', children: [{ type: 'IDENT', image: 'myType' }] },
                        { type: 'RPAREN', image: ')' },
                    ],
                }],
            });
        });

        it('should parse parenthetical types', () => {
            const parsed = parser.parse('type t = (int)');
            const type = parsed.toTree().children[0].children[3];
            expect(type).to.eql({
                type: 'Type',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'RPAREN', image: ')' },
                ],
            });
        });

        it('should parse array types', () => {
            let parsed = parser.parse('type t = int[]');
            let type = parsed.toTree().children[0].children[3];
            expect(type).to.eql({
                type: 'Type',
                children: [{
                    type: 'ArrayType',
                    children: [
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'LBRACK', image: '[' },
                        { type: 'RBRACK', image: ']' },
                    ],
                }],
            });

            parsed = parser.parse('type t = int[][]');
            type = parsed.toTree().children[0].children[3];
            expect(type).to.eql({
                type: 'Type',
                children: [{
                    type: 'ArrayType',
                    children: [
                        {
                            type: 'Type',
                            children: [{
                                type: 'ArrayType',
                                children: [
                                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                                    { type: 'LBRACK', image: '[' },
                                    { type: 'RBRACK', image: ']' },
                                ],
                            }],
                        },
                        { type: 'LBRACK', image: '[' },
                        { type: 'RBRACK', image: ']' },
                    ],
                }],
            });
        });

        it('should parse union types', () => {
            let parsed = parser.parse('type t = int | string');
            let type = parsed.toTree().children[0].children[3];
            expect(type).to.eql({
                type: 'Type',
                children: [{
                    type: 'UnionType',
                    children: [
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'OPER', image: '|' },
                        { type: 'Type', children: [{ type: 'STRING', image: 'string' }] },
                    ],
                }],
            });

            parsed = parser.parse('type t = int | char | string');
            type = parsed.toTree().children[0].children[3];
            expect(type).to.eql({
                type: 'Type',
                children: [{
                    type: 'UnionType',
                    children: [
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'OPER', image: '|' },
                        {
                            type: 'Type',
                            children: [{
                                type: 'UnionType',
                                children: [
                                    { type: 'Type', children: [{ type: 'CHAR', image: 'char' }] },
                                    { type: 'OPER', image: '|' },
                                    { type: 'Type', children: [{ type: 'STRING', image: 'string' }] },
                                ],
                            }],
                        },
                    ],
                }],
            });
        });
    });

    describe('parsing expressions', () => {
        it('should parse integer literal expressions', () => {
            const parsed = parser.parse('export v = 4');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{ type: 'INTEGER_LITERAL', image: '4' }],
            });
        });

        it('should parse floating point literal expressions', () => {
            const parsed = parser.parse('export v = 4.2');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{ type: 'FLOAT_LITERAL', image: '4.2' }],
            });
        });

        it('should parse string literal expressions', () => {
            const parsed = parser.parse('export v = "hello"');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{ type: 'STRING_LITERAL', image: '"hello"' }],
            });
        });

        it('should parse character literal expressions', () => {
            const parsed = parser.parse("export v = 'a'");
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{ type: 'CHARACTER_LITERAL', image: "'a'" }],
            });
        });

        it('should parse boolean literal expressions', () => {
            let parsed = parser.parse('export v = true');
            let exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{ type: 'TRUE', image: 'true' }],
            });

            parsed = parser.parse('export v = false');
            exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{ type: 'FALSE', image: 'false' }],
            });
        });

        it('should parse variable declaration expressions', () => {
            const parsed = parser.parse('export v = a = 2');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'VarDeclaration',
                    children: [
                        { type: 'IDENT', image: 'a' },
                        { type: 'EQUALS', image: '=' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                    ],
                }],
            });
        });

        it('should parse single-implicit-parameter lambda expressions', () => {
            const parsed = parser.parse('export v = a => 2');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'LambdaExpression',
                    children: [
                        { type: 'LambdaParamList', children: [{ type: 'IDENT', image: 'a' }] },
                        { type: 'FAT_ARROW', image: '=>' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                    ],
                }],
            });
        });

        it('should parse single-implicit-parameter (with parentheses) lambda expressions', () => {
            const parsed = parser.parse('export v = (a) => 2');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'LambdaExpression',
                    children: [
                        {
                            type: 'LambdaParamList',
                            children: [
                                { type: 'LPAREN', image: '(' },
                                { type: 'LambdaParam', children: [{ type: 'IDENT', image: 'a' }] },
                                { type: 'RPAREN', image: ')' },
                            ],
                        },
                        { type: 'FAT_ARROW', image: '=>' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                    ],
                }],
            });
        });

        it('should parse multi-implicit-parameter lambda expressions', () => {
            const parsed = parser.parse('export v = (a, b) => 2');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'LambdaExpression',
                    children: [
                        {
                            type: 'LambdaParamList',
                            children: [
                                { type: 'LPAREN', image: '(' },
                                { type: 'LambdaParam', children: [{ type: 'IDENT', image: 'a' }] },
                                { type: 'COMMA', image: ',' },
                                { type: 'LambdaParam', children: [{ type: 'IDENT', image: 'b' }] },
                                { type: 'RPAREN', image: ')' },
                            ],
                        },
                        { type: 'FAT_ARROW', image: '=>' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                    ],
                }],
            });
        });

        it('should parse single-explicit-parameter lambda expressions', () => {
            const parsed = parser.parse('export v = (int a) => 1');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'LambdaExpression',
                    children: [
                        {
                            type: 'LambdaParamList',
                            children: [
                                { type: 'LPAREN', image: '(' },
                                {
                                    type: 'LambdaParam',
                                    children: [
                                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                                        { type: 'IDENT', image: 'a' },
                                    ],
                                },
                                { type: 'RPAREN', image: ')' },
                            ],
                        },
                        { type: 'FAT_ARROW', image: '=>' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    ],
                }],
            });
        });

        it('should throw an error for a lambda expression with invalid parameters', () => {
            expect(() => parser.parse('export a = (1) => 2')).to.throw('Invalid lambda expression parameter (Line 1, Column 12)');
        });

        it('should parse identifier expression', () => {
            const parsed = parser.parse('export v = a');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{ type: 'IDENT', image: 'a' }],
            });
        });

        it('should parse array literal', () => {
            let parsed = parser.parse('export v = [1, 2, 3]');
            let exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'ArrayLiteral',
                    children: [
                        { type: 'LBRACK', image: '[' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '3' }] },
                        { type: 'RBRACK', image: ']' },
                    ],
                }],
            });

            parsed = parser.parse('export v = []');
            exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'ArrayLiteral',
                    children: [
                        { type: 'LBRACK', image: '[' },
                        { type: 'RBRACK', image: ']' },
                    ],
                }],
            });
        });

        it('should parse struct literal', () => {
            let parsed = parser.parse('export v = { a: 1, b: 2, c: 3 }');
            let exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'StructLiteral',
                    children: [
                        { type: 'LBRACE', image: '{' },
                        { type: 'IDENT', image: 'a' },
                        { type: 'COLON', image: ':' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'IDENT', image: 'b' },
                        { type: 'COLON', image: ':' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'IDENT', image: 'c' },
                        { type: 'COLON', image: ':' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '3' }] },
                        { type: 'RBRACE', image: '}' },
                    ],
                }],
            });

            parsed = parser.parse('export v = {}');
            exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'StructLiteral',
                    children: [
                        { type: 'LBRACE', image: '{' },
                        { type: 'RBRACE', image: '}' },
                    ],
                }],
            });
        });

        it('should parse tuple literal', () => {
            let parsed = parser.parse('export v = (1, 2, 3)');
            let exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'TupleLiteral',
                    children: [
                        { type: 'LPAREN', image: '(' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '3' }] },
                        { type: 'RPAREN', image: ')' },
                    ],
                }],
            });

            parsed = parser.parse('export v = ()');
            exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'TupleLiteral',
                    children: [
                        { type: 'LPAREN', image: '(' },
                        { type: 'RPAREN', image: ')' },
                    ],
                }],
            });
        });

        it('should throw an error for tuple literal with lambda params', () => {
            expect(() => parser.parse('export v = (int a, b, c)')).to.throw('Invalid expression (Line 1, Column 12)');
        });

        it('should parse if-else expressions', () => {
            const parsed = parser.parse('export v = if (1) 2 else 3');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'IfElseExpression',
                    children: [
                        { type: 'IF', image: 'if' },
                        { type: 'LPAREN', image: '(' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'RPAREN', image: ')' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                        { type: 'ELSE', image: 'else' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '3' }] },
                    ],
                }],
            });
        });

        it('should parse prefix expression', () => {
            const parsed = parser.parse('export v = !1');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'UnaryExpression',
                    children: [
                        { type: 'OPER', image: '!' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    ],
                }],
            });
        });

        it('should parse parenthetical expressions', () => {
            const parsed = parser.parse('export v = (1)');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    { type: 'RPAREN', image: ')' },
                ],
            });
        });

        it('should parse function application', () => {
            const parsed = parser.parse('export v = fun(1, 2, 3)');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'FunctionApplication',
                    children: [
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'fun' }] },
                        { type: 'LPAREN', image: '(' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                        { type: 'COMMA', image: ',' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '3' }] },
                        { type: 'RPAREN', image: ')' },
                    ],
                }],
            });
        });

        it('should parse binary expression', () => {
            const parsed = parser.parse('export v = 1 + 2');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'BinaryExpression',
                    children: [
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'OPER', image: '+' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                    ],
                }],
            });
        });

        it('should parse postfix expression', () => {
            const parsed = parser.parse('export v = 1++');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'UnaryExpression',
                    children: [
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'OPER', image: '++' },
                    ],
                }],
            });
        });

        it('should parse a field access', () => {
            const parsed = parser.parse('export v = a.b');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'FieldAccess',
                    children: [
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                        { type: 'DOT', image: '.' },
                        { type: 'IDENT', image: 'b' },
                    ],
                }],
            });
        });

        it('should parse an array access', () => {
            const parsed = parser.parse('export v = a[b]');
            const exp = parsed.toTree().children[0].children[3];
            expect(exp).to.eql({
                type: 'Expression',
                children: [{
                    type: 'ArrayAccess',
                    children: [
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                        { type: 'LBRACK', image: '[' },
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] },
                        { type: 'RBRACK', image: ']' },
                    ],
                }],
            });
        });
    });

    describe('parsing statements', () => {
        it('should parse an empty block', () => {
            const parsed = parser.parse('func void fun() => {}');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'Block',
                    children: [
                        { type: 'LBRACE', image: '{' },
                        { type: 'RBRACE', image: '}' },
                    ],
                }],
            });
        });

        it('should parse a block containing statements', () => {
            let parsed = parser.parse('func void fun() => { return }');
            let stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'Block',
                    children: [
                        { type: 'LBRACE', image: '{' },
                        {
                            type: 'Statement',
                            children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }],
                        },
                        { type: 'RBRACE', image: '}' },
                    ],
                }],
            });

            parsed = parser.parse('func void fun() => { i = 0; i++; return i }');
            stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'Block',
                    children: [
                        { type: 'LBRACE', image: '{' },
                        {
                            type: 'Statement',
                            children: [{
                                type: 'Expression',
                                children: [{
                                    type: 'VarDeclaration',
                                    children: [
                                        { type: 'IDENT', image: 'i' },
                                        { type: 'EQUALS', image: '=' },
                                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '0' }] },
                                    ],
                                }],
                            }],
                        },
                        {
                            type: 'Statement',
                            children: [{
                                type: 'Expression',
                                children: [{
                                    type: 'UnaryExpression',
                                    children: [
                                        { type: 'Expression', children: [{ type: 'IDENT', image: 'i' }] },
                                        { type: 'OPER', image: '++' },
                                    ],
                                }],
                            }],
                        },
                        {
                            type: 'Statement',
                            children: [{
                                type: 'ReturnStatement',
                                children: [
                                    { type: 'RETURN', image: 'return' },
                                    { type: 'Expression', children: [{ type: 'IDENT', image: 'i' }] },
                                ],
                            }],
                        },
                        { type: 'RBRACE', image: '}' },
                    ],
                }],
            });
        });

        it('should parse expression statements', () => {
            const parsed = parser.parse('func void fun() => { 1 }');
            const stmt = parsed.toTree().children[0].children[5].children[0].children[1];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{ type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] }],
            });
        });

        it('should parse for statements', () => {
            const parsed = parser.parse('func void fun() => for (i in thing) return');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ForStatement',
                    children: [
                        { type: 'FOR', image: 'for' },
                        { type: 'LPAREN', image: '(' },
                        { type: 'IDENT', image: 'i' },
                        { type: 'IN', image: 'in' },
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'thing' }] },
                        { type: 'RPAREN', image: ')' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                    ],
                }],
            });
        });

        it('should parse while statements', () => {
            const parsed = parser.parse('func void fun() => while (i) return');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'WhileStatement',
                    children: [
                        { type: 'WHILE', image: 'while' },
                        { type: 'LPAREN', image: '(' },
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'i' }] },
                        { type: 'RPAREN', image: ')' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                    ],
                }],
            });
        });

        it('should parse do-while statements', () => {
            const parsed = parser.parse('func void fun() => do return while (i)');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'DoWhileStatement',
                    children: [
                        { type: 'DO', image: 'do' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                        { type: 'WHILE', image: 'while' },
                        { type: 'LPAREN', image: '(' },
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'i' }] },
                        { type: 'RPAREN', image: ')' },
                    ],
                }],
            });
        });

        it('should parse try-catch statements', () => {
            const parsed = parser.parse('func void fun() => try return catch (int err) return');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'TryCatchStatement',
                    children: [
                        { type: 'TRY', image: 'try' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                        { type: 'CATCH', image: 'catch' },
                        { type: 'LPAREN', image: '(' },
                        {
                            type: 'Param',
                            children: [
                                { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                                { type: 'IDENT', image: 'err' },
                            ],
                        },
                        { type: 'RPAREN', image: ')' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                    ],
                }],
            });
        });

        it('should parse try-catch statements with multiple catch blocks', () => {
            const parsed = parser.parse('func void fun() => try return catch (int err) return catch (char c) return');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'TryCatchStatement',
                    children: [
                        { type: 'TRY', image: 'try' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                        { type: 'CATCH', image: 'catch' },
                        { type: 'LPAREN', image: '(' },
                        {
                            type: 'Param',
                            children: [
                                { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                                { type: 'IDENT', image: 'err' },
                            ],
                        },
                        { type: 'RPAREN', image: ')' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                        { type: 'CATCH', image: 'catch' },
                        { type: 'LPAREN', image: '(' },
                        {
                            type: 'Param',
                            children: [
                                { type: 'Type', children: [{ type: 'CHAR', image: 'char' }] },
                                { type: 'IDENT', image: 'c' },
                            ],
                        },
                        { type: 'RPAREN', image: ')' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                    ],
                }],
            });
        });

        it('should parse try-catch-finally statements', () => {
            const parsed = parser.parse('func void fun() => try return catch (int err) return finally return');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'TryCatchStatement',
                    children: [
                        { type: 'TRY', image: 'try' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                        { type: 'CATCH', image: 'catch' },
                        { type: 'LPAREN', image: '(' },
                        {
                            type: 'Param',
                            children: [
                                { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                                { type: 'IDENT', image: 'err' },
                            ],
                        },
                        { type: 'RPAREN', image: ')' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                        { type: 'FINALLY', image: 'finally' },
                        { type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] },
                    ],
                }],
            });
        });

        it('should parse throw statements', () => {
            const parsed = parser.parse('func void fun() => throw 1');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ThrowStatement',
                    children: [
                        { type: 'THROW', image: 'throw' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    ],
                }],
            });
        });

        it('should parse void return statements', () => {
            const parsed = parser.parse('func void fun() => return');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ReturnStatement',
                    children: [{ type: 'RETURN', image: 'return' }],
                }],
            });
        });

        it('should parse expression return statements', () => {
            const parsed = parser.parse('func void fun() => return 1');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ReturnStatement',
                    children: [
                        { type: 'RETURN', image: 'return' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    ],
                }],
            });
        });

        it('should parse break statements', () => {
            const parsed = parser.parse('func void fun() => break');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'BreakStatement',
                    children: [{ type: 'BREAK', image: 'break' }],
                }],
            });
        });

        it('should parse explicit loop number break statements', () => {
            const parsed = parser.parse('func void fun() => break 2');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'BreakStatement',
                    children: [
                        { type: 'BREAK', image: 'break' },
                        { type: 'INTEGER_LITERAL', image: '2' },
                    ],
                }],
            });
        });

        it('should parse continue statements', () => {
            const parsed = parser.parse('func void fun() => continue');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ContinueStatement',
                    children: [{ type: 'CONTINUE', image: 'continue' }],
                }],
            });
        });

        it('should parse explicit loop number continue statements', () => {
            const parsed = parser.parse('func void fun() => continue 2');
            const stmt = parsed.toTree().children[0].children[5];
            expect(stmt).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ContinueStatement',
                    children: [
                        { type: 'CONTINUE', image: 'continue' },
                        { type: 'INTEGER_LITERAL', image: '2' },
                    ],
                }],
            });
        });
    });
});*/
