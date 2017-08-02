import { expect } from 'chai';

import Parser from '../../src/parser/Parser';
import Tokenizer from '../../src/parser/Tokenizer';
import LookaheadIterator from '../../src/parser/LookaheadIterator';


const parser = new Parser();

describe('Parser', () => {
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

    it('should parse import declarations', () => {
        const sourceString =
`import from "myModule": MyDefaultImport
import from "otherModule" { name, name1 as oneName, myName }; import from "thirdModule": OtherDefault
`;
        const parsed = parser.parse(sourceString);
        expect(parsed.toTree()).to.eql({
            type: 'Program',
            children: [{
                type: 'ImportDeclaration',
                children: [
                    { type: 'IMPORT', image: 'import' },
                    { type: 'FROM', image: 'from' },
                    { type: 'STRING_LITERAL', image: '"myModule"' },
                    { type: 'COLON', image: ':' },
                    { type: 'IDENT', image: 'MyDefaultImport' },
                ],
            }, {
                type: 'ImportDeclaration',
                children: [
                    { type: 'IMPORT', image: 'import' },
                    { type: 'FROM', image: 'from' },
                    { type: 'STRING_LITERAL', image: '"otherModule"' },
                    { type: 'LBRACE', image: '{' },
                    {
                        type: 'ImportComponent',
                        children: [{ type: 'IDENT', image: 'name' }],
                    },
                    { type: 'COMMA', image: ',' },
                    {
                        type: 'ImportComponent',
                        children: [
                            { type: 'IDENT', image: 'name1' },
                            { type: 'AS', image: 'as' },
                            { type: 'IDENT', image: 'oneName' },
                        ],
                    },
                    { type: 'COMMA', image: ',' },
                    {
                        type: 'ImportComponent',
                        children: [{ type: 'IDENT', image: 'myName' }],
                    },
                    { type: 'RBRACE', image: '}' },
                ],
            }, {
                type: 'ImportDeclaration',
                children: [
                    { type: 'IMPORT', image: 'import' },
                    { type: 'FROM', image: 'from' },
                    { type: 'STRING_LITERAL', image: '"thirdModule"' },
                    { type: 'COLON', image: ':' },
                    { type: 'IDENT', image: 'OtherDefault' },
                ],
            }, { type: 'EOF', image: null }],
        });
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

    it('should parse built-in types', () => {
        const builtIns = ['u8', 'i8', 'byte', 'u16', 'i16', 'short', 'u32', 'i32', 'integer', 'u64', 'i64', 'long', 'int', 'f32', 'float', 'f64', 'double', 'string', 'char', 'bool', 'void'];
        for (const bi of builtIns) {
            const parsed = parser.parse(`type t = ${bi}`);
            const type = parsed.toTree().children[0].children[3];
            expect(type).to.eql({ type: 'Type', children: [{ type: bi.toUpperCase(), image: bi }] });
        }
    });

    it('should parse user-defined types', () => {
        const parsed = parser.parse('type t = myType');
        const type = parsed.toTree().children[0].children[3];
        expect(type).to.eql({ type: 'Type', children: [{ type: 'IDENT', image: 'myType' }] });
    });

    it('should parse struct types', () => {
        const parsed = parser.parse('type t = { int a; string b; myType c; }');
        const type = parsed.toTree().children[0].children[3];
        expect(type).to.eql({
            type: 'Type',
            children: [{
                type: 'StructType',
                children: [
                    { type: 'LBRACE', image: '{' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'IDENT', image: 'a' },
                    { type: 'Type', children: [{ type: 'STRING', image: 'string' }] },
                    { type: 'IDENT', image: 'b' },
                    { type: 'Type', children: [{ type: 'IDENT', image: 'myType' }] },
                    { type: 'IDENT', image: 'c' },
                    { type: 'RBRACE', image: '}' },
                ],
            }],
        });
    });

    it('should parse function types', () => {
        const parsed = parser.parse('type t = (int, string, myType) => void');
        const type = parsed.toTree().children[0].children[3];
        expect(type).to.eql({
            type: 'Type',
            children: [{
                type: 'FunctionType',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'Type', children: [{ type: 'STRING', image: 'string' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'Type', children: [{ type: 'IDENT', image: 'myType' }] },
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
                        type: 'ArrayType',
                        children: [
                            { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                            { type: 'LBRACK', image: '[' },
                            { type: 'RBRACK', image: ']' },
                        ],
                    },
                    { type: 'LBRACK', image: '[' },
                    { type: 'RBRACK', image: ']' },
                ],
            }],
        });
    });

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

    it('should parse an empty block', () => {
        const parsed = parser.parse('func void fun() => {}');
        const exp = parsed.toTree().children[0].children[5];
        expect(exp).to.eql({
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
});
