import { expect } from 'chai';

import * as pars from '../../src/parser/Parser';
import Parser from '../../src/parser/parser-control';


describe('parser', () => {
    describe('parsing declarations', () => {
        it('should parse Program', () => {
            expect(pars.acceptProgram(new Parser('')).toTree()).to.eql({ type: 'Program', children: [{ type: 'EOF', image: null }] });
            expect(pars.acceptProgram(new Parser('import from "module": myDefault')).toTree()).to.eql({
                type: 'Program',
                children: [{
                    type: 'ImportDeclaration',
                    children: [
                        { type: 'IMPORT', image: 'import' },
                        { type: 'FROM', image: 'from' },
                        { type: 'STRING_LITERAL', image: '"module"' },
                        { type: 'COLON', image: ':' },
                        { type: 'ImportList', children: [{ type: 'IDENT', image: 'myDefault' }] },
                    ],
                }, { type: 'EOF', image: null }],
            });
            expect(pars.acceptProgram(new Parser('func int a() => b')).toTree()).to.eql({
                type: 'Program',
                children: [{
                    type: 'Declaration',
                    children: [{
                        type: 'FunctionDeclaration',
                        children: [
                            { type: 'FUNC', image: 'func' },
                            { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                            { type: 'IDENT', image: 'a' },
                            { type: 'ParameterList', children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }] },
                            { type: 'FAT_ARROW', image: '=>' },
                            { type: 'FunctionBody', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] }] },
                        ],
                    }],
                }, { type: 'EOF', image: null }],
            });
            expect(pars.acceptProgram(new Parser('import from "module": myDefault;func int a() => b')).toTree()).to.eql({
                type: 'Program',
                children: [
                    {
                        type: 'ImportDeclaration',
                        children: [
                            { type: 'IMPORT', image: 'import' },
                            { type: 'FROM', image: 'from' },
                            { type: 'STRING_LITERAL', image: '"module"' },
                            { type: 'COLON', image: ':' },
                            { type: 'ImportList', children: [{ type: 'IDENT', image: 'myDefault' }] },
                        ],
                    },
                    {
                        type: 'Declaration',
                        children: [{
                            type: 'FunctionDeclaration',
                            children: [
                                { type: 'FUNC', image: 'func' },
                                { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                                { type: 'IDENT', image: 'a' },
                                { type: 'ParameterList', children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }] },
                                { type: 'FAT_ARROW', image: '=>' },
                                { type: 'FunctionBody', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] }] },
                            ],
                        }],
                    },
                    { type: 'EOF', image: null },
                ],
            });
        });

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

        it('should parse VarianceOp', () => {
            expect(pars.acceptVarianceOp(new Parser('+')).toTree()).to.eql({ type: 'VarianceOp', children: [{ type: 'OPER', image: '+' }] });
            expect(pars.acceptVarianceOp(new Parser('-')).toTree()).to.eql({ type: 'VarianceOp', children: [{ type: 'OPER', image: '-' }] });
        });

        it('should parse ConstraintOp', () => {
            expect(pars.acceptConstraintOp(new Parser(':')).toTree()).to.eql({ type: 'ConstraintOp', children: [{ type: 'COLON', image: ':' }] });
            expect(pars.acceptConstraintOp(new Parser('-:')).toTree()).to.eql({ type: 'ConstraintOp', children: [{ type: 'ASS_FROM', image: '-:' }] });
        });

        it('should parse TypeConstraint', () => {
            expect(pars.acceptTypeConstraint(new Parser(': int')).toTree()).to.eql({
                type: 'TypeConstraint',
                children: [
                    { type: 'ConstraintOp', children: [{ type: 'COLON', image: ':' }] },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                ],
            });
        });

        it('should parse TypeParam', () => {
            expect(pars.acceptTypeParam(new Parser('A')).toTree()).to.eql({ type: 'TypeParam', children: [{ type: 'IDENT', image: 'A' }] });
            expect(pars.acceptTypeParam(new Parser('+A')).toTree()).to.eql({
                type: 'TypeParam',
                children: [
                    { type: 'VarianceOp', children: [{ type: 'OPER', image: '+' }] },
                    { type: 'IDENT', image: 'A' },
                ],
            });
            expect(pars.acceptTypeParam(new Parser('A : int')).toTree()).to.eql({
                type: 'TypeParam',
                children: [
                    { type: 'IDENT', image: 'A' },
                    {
                        type: 'TypeConstraint',
                        children: [
                            { type: 'ConstraintOp', children: [{ type: 'COLON', image: ':' }] },
                            { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        ],
                    },
                ],
            });
            expect(pars.acceptTypeParam(new Parser('+A : int')).toTree()).to.eql({
                type: 'TypeParam',
                children: [
                    { type: 'VarianceOp', children: [{ type: 'OPER', image: '+' }] },
                    { type: 'IDENT', image: 'A' },
                    {
                        type: 'TypeConstraint',
                        children: [
                            { type: 'ConstraintOp', children: [{ type: 'COLON', image: ':' }] },
                            { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        ],
                    },
                ],
            });
        });

        it('should parse TypeParamList', () => {
            expect(pars.acceptTypeParamList(new Parser('<A, B>')).toTree()).to.eql({
                type: 'TypeParamList',
                children: [
                    { type: 'OPER', image: '<' },
                    { type: 'TypeParam', children: [{ type: 'IDENT', image: 'A' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'TypeParam', children: [{ type: 'IDENT', image: 'B' }] },
                    { type: 'OPER', image: '>' },
                ],
            });
        });

        it('should parse Param', () => {
            expect(pars.acceptParam(new Parser('int a')).toTree()).to.eql({
                type: 'Param',
                children: [
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'IDENT', image: 'a' },
                ],
            });
        });

        it('should parse ParameterList', () => {
            expect(pars.acceptParameterList(new Parser('()')).toTree()).to.eql({
                type: 'ParameterList',
                children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }],
            });
            expect(pars.acceptParameterList(new Parser('(int a, string b)')).toTree()).to.eql({
                type: 'ParameterList',
                children: [
                    { type: 'LPAREN', image: '(' },
                    {
                        type: 'Param',
                        children: [{ type: 'Type', children: [{ type: 'INT', image: 'int' }] }, { type: 'IDENT', image: 'a' }],
                    },
                    { type: 'COMMA', image: ',' },
                    {
                        type: 'Param',
                        children: [{ type: 'Type', children: [{ type: 'STRING', image: 'string' }] }, { type: 'IDENT', image: 'b' }],
                    },
                    { type: 'RPAREN', image: ')' },
                ],
            });
        });

        it('should parse FunctionBody', () => {
            expect(pars.acceptFunctionBody(new Parser('{}')).toTree()).to.eql({
                type: 'FunctionBody',
                children: [{ type: 'Block', children: [{ type: 'LBRACE', image: '{' }, { type: 'RBRACE', image: '}' }] }],
            });
            expect(pars.acceptFunctionBody(new Parser('a')).toTree()).to.eql({
                type: 'FunctionBody',
                children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }],
            });
            expect(pars.acceptFunctionBody(new Parser('return')).toTree()).to.eql({
                type: 'FunctionBody',
                children: [{ type: 'Statement', children: [{ type: 'ReturnStatement', children: [{ type: 'RETURN', image: 'return' }] }] }],
            });
        });

        it('should parse FunctionDeclaration', () => {
            expect(pars.acceptFunctionDeclaration(new Parser('func int a() => b')).toTree()).to.eql({
                type: 'FunctionDeclaration',
                children: [
                    { type: 'FUNC', image: 'func' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'IDENT', image: 'a' },
                    { type: 'ParameterList', children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }] },
                    { type: 'FAT_ARROW', image: '=>' },
                    { type: 'FunctionBody', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] }] },
                ],
            });
            expect(pars.acceptFunctionDeclaration(new Parser('func int a<A>() => b')).toTree()).to.eql({
                type: 'FunctionDeclaration',
                children: [
                    { type: 'FUNC', image: 'func' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'IDENT', image: 'a' },
                    {
                        type: 'TypeParamList',
                        children: [
                            { type: 'OPER', image: '<' },
                            { type: 'TypeParam', children: [{ type: 'IDENT', image: 'A' }] },
                            { type: 'OPER', image: '>' },
                        ],
                    },
                    { type: 'ParameterList', children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }] },
                    { type: 'FAT_ARROW', image: '=>' },
                    { type: 'FunctionBody', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] }] },
                ],
            });
        });

        it('should parse TypeDeclaration', () => {
            expect(pars.acceptTypeDeclaration(new Parser('type MyType = int')).toTree()).to.eql({
                type: 'TypeDeclaration',
                children: [
                    { type: 'TYPE', image: 'type' },
                    { type: 'IDENT', image: 'MyType' },
                    { type: 'EQUALS', image: '=' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                ],
            });
            expect(pars.acceptTypeDeclaration(new Parser('type MyType<A> = int')).toTree()).to.eql({
                type: 'TypeDeclaration',
                children: [
                    { type: 'TYPE', image: 'type' },
                    { type: 'IDENT', image: 'MyType' },
                    {
                        type: 'TypeParamList',
                        children: [
                            { type: 'OPER', image: '<' },
                            { type: 'TypeParam', children: [{ type: 'IDENT', image: 'A' }] },
                            { type: 'OPER', image: '>' },
                        ],
                    },
                    { type: 'EQUALS', image: '=' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                ],
            });
        });

        it('should parse NamedExport', () => {
            expect(pars.acceptNamedExport(new Parser('a =')).toTree()).to.eql({
                type: 'NamedExport',
                children: [{ type: 'IDENT', image: 'a' }, { type: 'EQUALS', image: '=' }],
            });
        });

        it('should parse ExportName', () => {
            expect(pars.acceptExportName(new Parser('default')).toTree()).to.eql({
                type: 'ExportName',
                children: [{ type: 'DEFAULT', image: 'default' }],
            });
            expect(pars.acceptExportName(new Parser('a =')).toTree()).to.eql({
                type: 'ExportName',
                children: [{
                    type: 'NamedExport',
                    children: [{ type: 'IDENT', image: 'a' }, { type: 'EQUALS', image: '=' }],
                }],
            });
        });

        it('should parse ExportValue', () => {
            expect(pars.acceptExportValue(new Parser('func int a() => b')).toTree()).to.eql({
                type: 'ExportValue',
                children: [{
                    type: 'FunctionDeclaration',
                    children: [
                        { type: 'FUNC', image: 'func' },
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'IDENT', image: 'a' },
                        { type: 'ParameterList', children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }] },
                        { type: 'FAT_ARROW', image: '=>' },
                        { type: 'FunctionBody', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] }] },
                    ],
                }],
            });
            expect(pars.acceptExportValue(new Parser('type MyType = int')).toTree()).to.eql({
                type: 'ExportValue',
                children: [{
                    type: 'TypeDeclaration',
                    children: [
                        { type: 'TYPE', image: 'type' },
                        { type: 'IDENT', image: 'MyType' },
                        { type: 'EQUALS', image: '=' },
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    ],
                }],
            });
            expect(pars.acceptExportValue(new Parser('a')).toTree()).to.eql({
                type: 'ExportValue',
                children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }],
            });
        });

        it('should parse ExportDeclaration', () => {
            expect(pars.acceptExportDeclaration(new Parser('export default a')).toTree()).to.eql({
                type: 'ExportDeclaration',
                children: [
                    { type: 'EXPORT', image: 'export' },
                    { type: 'ExportName', children: [{ type: 'DEFAULT', image: 'default' }] },
                    { type: 'ExportValue', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                ],
            });
        });

        it('should parse Declaration', () => {
            expect(pars.acceptDeclaration(new Parser('func int a() => b')).toTree()).to.eql({
                type: 'Declaration',
                children: [{
                    type: 'FunctionDeclaration',
                    children: [
                        { type: 'FUNC', image: 'func' },
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                        { type: 'IDENT', image: 'a' },
                        { type: 'ParameterList', children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }] },
                        { type: 'FAT_ARROW', image: '=>' },
                        { type: 'FunctionBody', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] }] },
                    ],
                }],
            });
            expect(pars.acceptDeclaration(new Parser('type MyType = int')).toTree()).to.eql({
                type: 'Declaration',
                children: [{
                    type: 'TypeDeclaration',
                    children: [
                        { type: 'TYPE', image: 'type' },
                        { type: 'IDENT', image: 'MyType' },
                        { type: 'EQUALS', image: '=' },
                        { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    ],
                }],
            });
            expect(pars.acceptDeclaration(new Parser('export default a')).toTree()).to.eql({
                type: 'Declaration',
                children: [{
                    type: 'ExportDeclaration',
                    children: [
                        { type: 'EXPORT', image: 'export' },
                        { type: 'ExportName', children: [{ type: 'DEFAULT', image: 'default' }] },
                        { type: 'ExportValue', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                    ],
                }],
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
            expect(pars.acceptType(new Parser('(int)')).toTree()).to.eql({
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
            expect(pars.acceptType(new Parser('()')).toTree()).to.eql({
                type: 'Type',
                children: [{
                    type: 'TupleType',
                    children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }],
                }],
            });
            expect(pars.acceptType(new Parser('MyType<>')).toTree()).to.eql({
                type: 'Type',
                children: [{
                    type: 'GenericType',
                    children: [
                        { type: 'IDENT', image: 'MyType' },
                        { type: 'TypeArgList', children: [{ type: 'OPER', image: '<' }, { type: 'OPER', image: '>' }] },
                    ],
                }],
            });
            expect(pars.acceptType(new Parser('MyType')).toTree()).to.eql({ type: 'Type', children: [{ type: 'IDENT', image: 'MyType' }] });
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
            expect(pars.acceptType(new Parser('int | string')).toTree()).to.eql({
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

        it('should parse ParenthesizedType', () => {
            const parsed = pars.acceptParenthesizedType(new Parser('(int)'));
            expect(parsed.toTree()).to.eql({
                type: 'ParenthesizedType',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'RPAREN', image: ')' },
                ],
            });
        });

        it('should parse TupleType', () => {
            const parsed = pars.acceptTupleType(new Parser('(int, int)'));
            expect(parsed.toTree()).to.eql({
                type: 'TupleType',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'RPAREN', image: ')' },
                ],
            });
        });

        it('should accept TypeArgList', () => {
            const parsed = pars.acceptTypeArgList(new Parser('<int, int>'));
            expect(parsed.toTree()).to.eql({
                type: 'TypeArgList',
                children: [
                    { type: 'OPER', image: '<' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                    { type: 'OPER', image: '>' },
                ],
            });
        });

        it('should parse GenericType', () => {
            const parsed = pars.acceptGenericType(new Parser('MyType<int, string, void>'));
            expect(parsed.toTree()).to.eql({
                type: 'GenericType',
                children: [
                    { type: 'IDENT', image: 'MyType' },
                    {
                        type: 'TypeArgList',
                        children: [
                            { type: 'OPER', image: '<' },
                            { type: 'Type', children: [{ type: 'INT', image: 'int' }] },
                            { type: 'COMMA', image: ',' },
                            { type: 'Type', children: [{ type: 'STRING', image: 'string' }] },
                            { type: 'COMMA', image: ',' },
                            { type: 'Type', children: [{ type: 'VOID', image: 'void' }] },
                            { type: 'OPER', image: '>' },
                        ],
                    },
                ],
            });
        });

        it('should parse UnionType', () => {
            const parsed = pars.acceptUnionTypeSuffix(new Parser('| string'));
            expect(parsed.toTree()).to.eql({
                type: 'UnionType',
                children: [
                    { type: 'OPER', image: '|' },
                    { type: 'Type', children: [{ type: 'STRING', image: 'string' }] },
                ],
            });
        });
    });

    describe('parsing expressions', () => {
        it('should parse Expression', () => {
            expect(pars.acceptExpression(new Parser('1')).toTree()).to.eql({ type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] });
            expect(pars.acceptExpression(new Parser('1.5')).toTree()).to.eql({ type: 'Expression', children: [{ type: 'FLOAT_LITERAL', image: '1.5' }] });
            expect(pars.acceptExpression(new Parser('""')).toTree()).to.eql({ type: 'Expression', children: [{ type: 'STRING_LITERAL', image: '""' }] });
            expect(pars.acceptExpression(new Parser("'a'")).toTree()).to.eql({ type: 'Expression', children: [{ type: 'CHARACTER_LITERAL', image: "'a'" }] });
            expect(pars.acceptExpression(new Parser('true')).toTree()).to.eql({ type: 'Expression', children: [{ type: 'TRUE', image: 'true' }] });
            expect(pars.acceptExpression(new Parser('false')).toTree()).to.eql({ type: 'Expression', children: [{ type: 'FALSE', image: 'false' }] });
            expect(pars.acceptExpression(new Parser('a = 1')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'VarDeclaration',
                    children: [
                        { type: 'IDENT', image: 'a' },
                        { type: 'EQUALS', image: '=' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    ],
                }],
            });
            expect(pars.acceptExpression(new Parser('a => 1')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'LambdaExpression',
                    children: [
                        { type: 'IDENT', image: 'a' },
                        { type: 'FAT_ARROW', image: '=>' },
                        {
                            type: 'FunctionBody',
                            children: [{ type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] }],
                        },
                    ],
                }],
            });
            expect(pars.acceptExpression(new Parser('a')).toTree()).to.eql({ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] });
            expect(pars.acceptExpression(new Parser('[]')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'ArrayLiteral',
                    children: [{ type: 'LBRACK', image: '[' }, { type: 'RBRACK', image: ']' }],
                }],
            });
            expect(pars.acceptExpression(new Parser('{}')).toTree()).to.eql({
                type: 'Expression',
                children: [{ type: 'StructLiteral', children: [{ type: 'LBRACE', image: '{' }, { type: 'RBRACE', image: '}' }] }],
            });
            expect(pars.acceptExpression(new Parser('if (1) 2 else 3')).toTree()).to.eql({
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
            expect(pars.acceptExpression(new Parser('+1')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'PrefixExpression',
                    children: [
                        { type: 'OPER', image: '+' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    ],
                }],
            });
            expect(pars.acceptExpression(new Parser('() => a')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'LambdaExpression',
                    children: [
                        { type: 'LPAREN', image: '(' },
                        { type: 'RPAREN', image: ')' },
                        { type: 'FAT_ARROW', image: '=>' },
                        { type: 'FunctionBody', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                    ],
                }],
            });
            expect(pars.acceptExpression(new Parser('(1)')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'ParenthesizedExpression',
                    children: [
                        { type: 'LPAREN', image: '(' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'RPAREN', image: ')' },
                    ],
                }],
            });
            expect(pars.acceptExpression(new Parser('()')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'TupleLiteral',
                    children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }],
                }],
            });
            expect(pars.acceptExpression(new Parser('a()')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'FunctionApplication',
                    children: [
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                        { type: 'LPAREN', image: '(' },
                        { type: 'RPAREN', image: ')' },
                    ],
                }],
            });
            expect(pars.acceptExpression(new Parser('1+1')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'BinaryExpression',
                    children: [
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'OPER', image: '+' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    ],
                }],
            });
            expect(pars.acceptExpression(new Parser('1+')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'PostfixExpression',
                    children: [
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'OPER', image: '+' },
                    ],
                }],
            });
            expect(pars.acceptExpression(new Parser('a.a')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'FieldAccess',
                    children: [
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                        { type: 'DOT', image: '.' },
                        { type: 'IDENT', image: 'a' },
                    ],
                }],
            });
            expect(pars.acceptExpression(new Parser('a[1]')).toTree()).to.eql({
                type: 'Expression',
                children: [{
                    type: 'ArrayAccess',
                    children: [
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                        { type: 'LBRACK', image: '[' },
                        { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                        { type: 'RBRACK', image: ']' },
                    ],
                }],
            });
        });

        it('should parse VarDeclaration', () => {
            expect(pars.acceptVarDeclaration(new Parser('a = 1')).toTree()).to.eql({
                type: 'VarDeclaration',
                children: [
                    { type: 'IDENT', image: 'a' },
                    { type: 'EQUALS', image: '=' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                ],
            });
        });

        it('should parse shorthand LambdaExpression', () => {
            expect(pars.acceptShorthandLambdaExpression(new Parser('a => 1')).toTree()).to.eql({
                type: 'LambdaExpression',
                children: [
                    { type: 'IDENT', image: 'a' },
                    { type: 'FAT_ARROW', image: '=>' },
                    {
                        type: 'FunctionBody',
                        children: [{ type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] }],
                    },
                ],
            });
        });

        it('should parse ArrayLiteral', () => {
            expect(pars.acceptArrayLiteral(new Parser('[]')).toTree()).to.eql({ type: 'ArrayLiteral', children: [{ type: 'LBRACK', image: '[' }, { type: 'RBRACK', image: ']' }] });
            expect(pars.acceptArrayLiteral(new Parser('[1, 2]')).toTree()).to.eql({
                type: 'ArrayLiteral',
                children: [
                    { type: 'LBRACK', image: '[' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                    { type: 'RBRACK', image: ']' },
                ],
            });
        });

        it('should parse StructEntry', () => {
            expect(pars.acceptStructEntry(new Parser('a: 1')).toTree()).to.eql({
                type: 'StructEntry',
                children: [
                    { type: 'IDENT', image: 'a' },
                    { type: 'COLON', image: ':' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                ],
            });
        });

        it('should parse StructLiteral', () => {
            expect(pars.acceptStructLiteral(new Parser('{}')).toTree()).to.eql({ type: 'StructLiteral', children: [{ type: 'LBRACE', image: '{' }, { type: 'RBRACE', image: '}' }] });
            expect(pars.acceptStructLiteral(new Parser('{ a: 1, b: 2 }')).toTree()).to.eql({
                type: 'StructLiteral',
                children: [
                    { type: 'LBRACE', image: '{' },
                    {
                        type: 'StructEntry',
                        children: [{ type: 'IDENT', image: 'a' }, { type: 'COLON', image: ':' }, { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] }],
                    },
                    { type: 'COMMA', image: ',' },
                    {
                        type: 'StructEntry',
                        children: [{ type: 'IDENT', image: 'b' }, { type: 'COLON', image: ':' }, { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] }],
                    },
                    { type: 'RBRACE', image: '}' },
                ],
            });
        });

        it('should parse IfElseExpression', () => {
            expect(pars.acceptIfElseExpression(new Parser('if (1) 2 else 3')).toTree()).to.eql({
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
            });
        });

        it('should parse PrefixExpression', () => {
            expect(pars.acceptPrefixExpression(new Parser('+1')).toTree()).to.eql({
                type: 'PrefixExpression',
                children: [
                    { type: 'OPER', image: '+' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                ],
            });
        });

        it('should parse LambdaParam', () => {
            expect(pars.acceptLambdaParam(new Parser('a')).toTree()).to.eql({
                type: 'LambdaParam',
                children: [{ type: 'IDENT', image: 'a' }],
            });
            expect(pars.acceptLambdaParam(new Parser('int a')).toTree()).to.eql({
                type: 'LambdaParam',
                children: [{ type: 'Param', children: [{ type: 'Type', children: [{ type: 'INT', image: 'int' }] }, { type: 'IDENT', image: 'a' }] }],
            });
        });

        it('should parse LambdaExpression', () => {
            expect(pars.acceptLambdaExpression(new Parser('() => a')).toTree()).to.eql({
                type: 'LambdaExpression',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'RPAREN', image: ')' },
                    { type: 'FAT_ARROW', image: '=>' },
                    { type: 'FunctionBody', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                ],
            });
            expect(pars.acceptLambdaExpression(new Parser('(a, b) => c')).toTree()).to.eql({
                type: 'LambdaExpression',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'LambdaParam', children: [{ type: 'IDENT', image: 'a' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'LambdaParam', children: [{ type: 'IDENT', image: 'b' }] },
                    { type: 'RPAREN', image: ')' },
                    { type: 'FAT_ARROW', image: '=>' },
                    { type: 'FunctionBody', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'c' }] }] },
                ],
            });
        });

        it('should parse ParenthesizedExpression', () => {
            expect(pars.acceptParenthesizedExpression(new Parser('(1)')).toTree()).to.eql({
                type: 'ParenthesizedExpression',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    { type: 'RPAREN', image: ')' },
                ],
            });
        });

        it('should parse TupleLiteral', () => {
            expect(pars.acceptTupleLiteral(new Parser('()')).toTree()).to.eql({ type: 'TupleLiteral', children: [{ type: 'LPAREN', image: '(' }, { type: 'RPAREN', image: ')' }] });
            expect(pars.acceptTupleLiteral(new Parser('(1, 2)')).toTree()).to.eql({
                type: 'TupleLiteral',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                    { type: 'RPAREN', image: ')' },
                ],
            });
        });

        it('should parse FunctionApplication suffix', () => {
            expect(pars.acceptFunctionApplicationSuffix(new Parser('(1, 2)')).toTree()).to.eql({
                type: 'FunctionApplication',
                children: [
                    { type: 'LPAREN', image: '(' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    { type: 'COMMA', image: ',' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '2' }] },
                    { type: 'RPAREN', image: ')' },
                ],
            });

            expect(pars.acceptFunctionApplicationSuffix(new Parser('<>()')).toTree()).to.eql({
                type: 'FunctionApplication',
                children: [
                    { type: 'TypeArgList', children: [{ type: 'OPER', image: '<' }, { type: 'OPER', image: '>' }] },
                    { type: 'LPAREN', image: '(' },
                    { type: 'RPAREN', image: ')' },
                ],
            });
        });

        it('should parse BinaryExpression suffix', () => {
            expect(pars.acceptBinaryExpressionSuffix(new Parser('+1')).toTree()).to.eql({
                type: 'BinaryExpression',
                children: [
                    { type: 'OPER', image: '+' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                ],
            });
        });

        it('should parse PostfixExpression suffix', () => {
            expect(pars.acceptPostfixExpressionSuffix(new Parser('+')).toTree()).to.eql({
                type: 'PostfixExpression',
                children: [
                    { type: 'OPER', image: '+' },
                ],
            });
        });

        it('should parse FieldAccess suffix', () => {
            expect(pars.acceptFieldAccessSuffix(new Parser('.a')).toTree()).to.eql({
                type: 'FieldAccess',
                children: [{ type: 'DOT', image: '.' }, { type: 'IDENT', image: 'a' }],
            });
        });

        it('should parse ArrayAccess suffix', () => {
            expect(pars.acceptArrayAccessSuffix(new Parser('[1]')).toTree()).to.eql({
                type: 'ArrayAccess',
                children: [
                    { type: 'LBRACK', image: '[' },
                    { type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] },
                    { type: 'RBRACK', image: ']' },
                ],
            });
        });
    });

    describe('parsing statements', () => {
        it('should parse Statement', () => {
            expect(pars.acceptStatement(new Parser('{}')).toTree()).to.eql({
                type: 'Statement',
                children: [{ type: 'Block', children: [{ type: 'LBRACE', image: '{' }, { type: 'RBRACE', image: '}' }] }],
            });
            expect(pars.acceptStatement(new Parser('1')).toTree()).to.eql({
                type: 'Statement',
                children: [{ type: 'Expression', children: [{ type: 'INTEGER_LITERAL', image: '1' }] }],
            });
            expect(pars.acceptStatement(new Parser('for (a in b) c')).toTree()).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ForStatement',
                    children: [
                        { type: 'FOR', image: 'for' },
                        { type: 'LPAREN', image: '(' },
                        { type: 'IDENT', image: 'a' },
                        { type: 'IN', image: 'in' },
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] },
                        { type: 'RPAREN', image: ')' },
                        { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'c' }] }] },
                    ],
                }],
            });
            expect(pars.acceptStatement(new Parser('while (a) b')).toTree()).to.eql({
                type: 'Statement',
                children: [{
                    type: 'WhileStatement',
                    children: [
                        { type: 'WHILE', image: 'while' },
                        { type: 'LPAREN', image: '(' },
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                        { type: 'RPAREN', image: ')' },
                        { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] }] },
                    ],
                }],
            });
            expect(pars.acceptStatement(new Parser('do a while (b)')).toTree()).to.eql({
                type: 'Statement',
                children: [{
                    type: 'DoWhileStatement',
                    children: [
                        { type: 'DO', image: 'do' },
                        { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                        { type: 'WHILE', image: 'while' },
                        { type: 'LPAREN', image: '(' },
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] },
                        { type: 'RPAREN', image: ')' },
                    ],
                }],
            });
            expect(pars.acceptStatement(new Parser('try a catch (b c) d')).toTree()).to.eql({
                type: 'Statement',
                children: [{
                    type: 'TryCatchStatement',
                    children: [
                        { type: 'TRY', image: 'try' },
                        { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                        {
                            type: 'CatchClause',
                            children: [
                                { type: 'CATCH', image: 'catch' },
                                { type: 'LPAREN', image: '(' },
                                { type: 'Param', children: [{ type: 'Type', children: [{ type: 'IDENT', image: 'b' }] }, { type: 'IDENT', image: 'c' }] },
                                { type: 'RPAREN', image: ')' },
                                { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'd' }] }] },
                            ],
                        },
                    ],
                }],
            });
            expect(pars.acceptStatement(new Parser('return')).toTree()).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ReturnStatement',
                    children: [{ type: 'RETURN', image: 'return' }],
                }],
            });
            expect(pars.acceptStatement(new Parser('throw a')).toTree()).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ThrowStatement',
                    children: [
                        { type: 'THROW', image: 'throw' },
                        { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                    ],
                }],
            });
            expect(pars.acceptStatement(new Parser('break')).toTree()).to.eql({
                type: 'Statement',
                children: [{
                    type: 'BreakStatement',
                    children: [{ type: 'BREAK', image: 'break' }],
                }],
            });
            expect(pars.acceptStatement(new Parser('continue')).toTree()).to.eql({
                type: 'Statement',
                children: [{
                    type: 'ContinueStatement',
                    children: [{ type: 'CONTINUE', image: 'continue' }],
                }],
            });
        });

        it('should parse Block', () => {
            expect(pars.acceptBlock(new Parser('{}')).toTree()).to.eql({
                type: 'Block',
                children: [{ type: 'LBRACE', image: '{' }, { type: 'RBRACE', image: '}' }],
            });
        });

        it('should parse ForStatement', () => {
            expect(pars.acceptForStatement(new Parser('for (a in b) c')).toTree()).to.eql({
                type: 'ForStatement',
                children: [
                    { type: 'FOR', image: 'for' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'IDENT', image: 'a' },
                    { type: 'IN', image: 'in' },
                    { type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] },
                    { type: 'RPAREN', image: ')' },
                    { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'c' }] }] },
                ],
            });
        });

        it('should parse WhileStatement', () => {
            expect(pars.acceptWhileStatement(new Parser('while (a) b')).toTree()).to.eql({
                type: 'WhileStatement',
                children: [
                    { type: 'WHILE', image: 'while' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                    { type: 'RPAREN', image: ')' },
                    { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] }] },
                ],
            });
        });

        it('should parse DoWhileStatement', () => {
            expect(pars.acceptDoWhileStatement(new Parser('do a while (b)')).toTree()).to.eql({
                type: 'DoWhileStatement',
                children: [
                    { type: 'DO', image: 'do' },
                    { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                    { type: 'WHILE', image: 'while' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'Expression', children: [{ type: 'IDENT', image: 'b' }] },
                    { type: 'RPAREN', image: ')' },
                ],
            });
        });

        it('should parse CatchClause', () => {
            expect(pars.acceptCatchClause(new Parser('catch (a b) c')).toTree()).to.eql({
                type: 'CatchClause',
                children: [
                    { type: 'CATCH', image: 'catch' },
                    { type: 'LPAREN', image: '(' },
                    { type: 'Param', children: [{ type: 'Type', children: [{ type: 'IDENT', image: 'a' }] }, { type: 'IDENT', image: 'b' }] },
                    { type: 'RPAREN', image: ')' },
                    { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'c' }] }] },
                ],
            });
        });

        it('should parse FinallyClause', () => {
            expect(pars.acceptFinallyClause(new Parser('finally a')).toTree()).to.eql({
                type: 'FinallyClause',
                children: [
                    { type: 'FINALLY', image: 'finally' },
                    { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                ],
            });
        });

        it('should parse TryCatchStatement', () => {
            expect(pars.acceptTryCatchStatement(new Parser('try a catch (b c) d')).toTree()).to.eql({
                type: 'TryCatchStatement',
                children: [
                    { type: 'TRY', image: 'try' },
                    { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                    {
                        type: 'CatchClause',
                        children: [
                            { type: 'CATCH', image: 'catch' },
                            { type: 'LPAREN', image: '(' },
                            { type: 'Param', children: [{ type: 'Type', children: [{ type: 'IDENT', image: 'b' }] }, { type: 'IDENT', image: 'c' }] },
                            { type: 'RPAREN', image: ')' },
                            { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'd' }] }] },
                        ],
                    },
                ],
            });
            expect(pars.acceptTryCatchStatement(new Parser('try a catch (b c) d catch (e f) g')).toTree()).to.eql({
                type: 'TryCatchStatement',
                children: [
                    { type: 'TRY', image: 'try' },
                    { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                    {
                        type: 'CatchClause',
                        children: [
                            { type: 'CATCH', image: 'catch' },
                            { type: 'LPAREN', image: '(' },
                            { type: 'Param', children: [{ type: 'Type', children: [{ type: 'IDENT', image: 'b' }] }, { type: 'IDENT', image: 'c' }] },
                            { type: 'RPAREN', image: ')' },
                            { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'd' }] }] },
                        ],
                    },
                    {
                        type: 'CatchClause',
                        children: [
                            { type: 'CATCH', image: 'catch' },
                            { type: 'LPAREN', image: '(' },
                            { type: 'Param', children: [{ type: 'Type', children: [{ type: 'IDENT', image: 'e' }] }, { type: 'IDENT', image: 'f' }] },
                            { type: 'RPAREN', image: ')' },
                            { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'g' }] }] },
                        ],
                    },
                ],
            });
            expect(pars.acceptTryCatchStatement(new Parser('try a catch (b c) d finally e')).toTree()).to.eql({
                type: 'TryCatchStatement',
                children: [
                    { type: 'TRY', image: 'try' },
                    { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] }] },
                    {
                        type: 'CatchClause',
                        children: [
                            { type: 'CATCH', image: 'catch' },
                            { type: 'LPAREN', image: '(' },
                            { type: 'Param', children: [{ type: 'Type', children: [{ type: 'IDENT', image: 'b' }] }, { type: 'IDENT', image: 'c' }] },
                            { type: 'RPAREN', image: ')' },
                            { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'd' }] }] },
                        ],
                    },
                    {
                        type: 'FinallyClause',
                        children: [
                            { type: 'FINALLY', image: 'finally' },
                            { type: 'Statement', children: [{ type: 'Expression', children: [{ type: 'IDENT', image: 'e' }] }] },
                        ],
                    },
                ],
            });
        });

        it('should parse ReturnStatement', () => {
            expect(pars.acceptReturnStatement(new Parser('return a')).toTree()).to.eql({
                type: 'ReturnStatement',
                children: [
                    { type: 'RETURN', image: 'return' },
                    { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                ],
            });
            expect(pars.acceptReturnStatement(new Parser('return')).toTree()).to.eql({
                type: 'ReturnStatement',
                children: [{ type: 'RETURN', image: 'return' }],
            });
        });

        it('should parse ThrowStatement', () => {
            expect(pars.acceptThrowStatement(new Parser('throw a')).toTree()).to.eql({
                type: 'ThrowStatement',
                children: [
                    { type: 'THROW', image: 'throw' },
                    { type: 'Expression', children: [{ type: 'IDENT', image: 'a' }] },
                ],
            });
        });

        it('should parse BreakStatement', () => {
            expect(pars.acceptBreakStatement(new Parser('break')).toTree()).to.eql({
                type: 'BreakStatement',
                children: [{ type: 'BREAK', image: 'break' }],
            });
            expect(pars.acceptBreakStatement(new Parser('break 2')).toTree()).to.eql({
                type: 'BreakStatement',
                children: [{ type: 'BREAK', image: 'break' }, { type: 'INTEGER_LITERAL', image: '2' }],
            });
        });

        it('should parse ContinueStatement', () => {
            expect(pars.acceptContinueStatement(new Parser('continue')).toTree()).to.eql({
                type: 'ContinueStatement',
                children: [{ type: 'CONTINUE', image: 'continue' }],
            });
            expect(pars.acceptContinueStatement(new Parser('continue 2')).toTree()).to.eql({
                type: 'ContinueStatement',
                children: [{ type: 'CONTINUE', image: 'continue' }, { type: 'INTEGER_LITERAL', image: '2' }],
            });
        });
    });
});
