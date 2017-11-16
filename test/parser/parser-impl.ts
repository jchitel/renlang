import { assert } from 'chai';

import * as pars from '~/parser/parser-impl';
import Parser from '~/parser/Parser';
import { nodeToObject } from './test-utils';
import { STType } from '~/syntax/types/cst';


describe('parser', () => {
    describe('parsing declarations', () => {
        it('should parse Program', () => {
            assert.deepEqual(nodeToObject(pars.acceptProgram(new Parser(''))), {
                imports: [],
                declarations: [],
                eof: '',
            });
            assert.containSubset(nodeToObject(pars.acceptProgram(new Parser('import from "module": myDefault'))), {
                imports: { length: 1 },
                eof: '',
            });
            assert.containSubset(nodeToObject(pars.acceptProgram(new Parser('func int a() => b'))), {
                declarations: { length: 1 },
                eof: '',
            });
            assert.containSubset(nodeToObject(pars.acceptProgram(new Parser('import from "module": myDefault;func int a() => b'))), {
                imports: { length: 1 },
                declarations: { length: 1 },
                eof: '',
            });
        });

        it('should parse ImportDeclaration', () => {
            const common = { importToken: 'import', fromToken: 'from', moduleNameToken: '""', colonToken: ':' };
            const parse = (source: string) => nodeToObject(pars.acceptImportDeclaration(new Parser(source)));
            assert.containSubset(parse('import from "": a'), {
                ...common,
                imports: { choice: 'a' },
            });
            assert.containSubset(parse('import from "": { a as b, * as c }'), {
                ...common,
                imports: {
                    choice: {
                        openBraceToken: '{',
                        importComponents: [{
                            choice: { importNameToken: 'a', asToken: 'as', importAliasToken: 'b' },
                        }, {
                            choice: { multiplyToken: '*', asToken: 'as', wildcardAliasToken: 'c' },
                        }],
                        commaTokens: [','],
                        closeBraceToken: '}',
                    },
                },
            });
            assert.containSubset(parse('import from "": a, { b }'), {
                ...common,
                imports: {
                    choice: {
                        defaultImportNameToken: 'a',
                        commaToken: ',',
                        imports: { openBraceToken: '{', importComponents: [{ choice: 'b' }], closeBraceToken: '}' },
                    },
                },
            });
            assert.containSubset(parse('import from "": * as a'), {
                ...common,
                imports: {
                    choice: { multiplyToken: '*', asToken: 'as', wildcardAliasToken: 'a' },
                },
            });
            assert.containSubset(parse('import from "": a, * as b'), {
                ...common,
                imports: {
                    choice: {
                        defaultImportNameToken: 'a',
                        commaToken: ',',
                        wildcard: { multiplyToken: '*', asToken: 'as', wildcardAliasToken: 'b' },
                    },
                },
            });
        });

        it('should parse VarianceOp', () => {
            assert.containSubset(nodeToObject(pars.acceptVarianceOp(new Parser('+'))), { choice: '+' });
            assert.containSubset(nodeToObject(pars.acceptVarianceOp(new Parser('-'))), { choice: '-' });
        });

        it('should parse TypeConstraint', () => {
            assert.containSubset(nodeToObject(pars.acceptTypeConstraint(new Parser(': int'))), {
                colonToken: ':',
                constraintType: {},
            });
        });

        it('should parse TypeParam', () => {
            assert.deepEqual(nodeToObject(pars.acceptTypeParam(new Parser('A'))), { nameToken: 'A' });
            assert.containSubset(nodeToObject(pars.acceptTypeParam(new Parser('+A'))), {
                varianceOp: {},
                nameToken: 'A',
            });
            assert.containSubset(nodeToObject(pars.acceptTypeParam(new Parser('A : int'))), {
                nameToken: 'A',
                typeConstraint: {},
            });
            assert.containSubset(nodeToObject(pars.acceptTypeParam(new Parser('+A : int'))), {
                varianceOp: {},
                nameToken: 'A',
                typeConstraint: {},
            });
        });

        it('should parse TypeParamList', () => {
            assert.containSubset(nodeToObject(pars.acceptTypeParamList(new Parser('<A, B>'))), {
                openLtToken: '<',
                typeParams: { length: 2 },
                closeGtToken: '>',
            });
        });

        it('should parse Param', () => {
            assert.containSubset(nodeToObject(pars.acceptParam(new Parser('int a'))), {
                typeNode: {},
                nameToken: 'a',
            });
        });

        it('should parse ParameterList', () => {
            assert.containSubset(nodeToObject(pars.acceptParameterList(new Parser('()'))), {
                openParenToken: '(',
                closeParenToken: ')',
            });
            assert.containSubset(nodeToObject(pars.acceptParameterList(new Parser('(int a, string b)'))), {
                openParenToken: '(',
                params: { length: 2 },
                closeParenToken: ')',
            });
        });

        it('should parse FunctionBody', () => {
            assert.containSubset(nodeToObject(pars.acceptFunctionBody(new Parser('{}'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptFunctionBody(new Parser('a'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptFunctionBody(new Parser('return'))), { choice: {} });
        });

        it('should parse FunctionDeclaration', () => {
            assert.containSubset(nodeToObject(pars.acceptFunctionDeclaration(new Parser('func int a() => b'))), {
                funcToken: 'func',
                returnType: {},
                functionNameToken: 'a',
                paramsList: {},
                fatArrowToken: '=>',
                functionBody: {},
            });
            assert.containSubset(nodeToObject(pars.acceptFunctionDeclaration(new Parser('func int a<A>() => b'))), {
                funcToken: 'func',
                returnType: {},
                functionNameToken: 'a',
                typeParamList: {},
                paramsList: {},
                fatArrowToken: '=>',
                functionBody: {},
            });
        });

        it('should parse TypeDeclaration', () => {
            assert.containSubset(nodeToObject(pars.acceptTypeDeclaration(new Parser('type MyType = int'))), {
                typeToken: 'type',
                typeNameToken: 'MyType',
                equalsToken: '=',
                typeNode: {},
            });
            assert.containSubset(nodeToObject(pars.acceptTypeDeclaration(new Parser('type MyType<A> = int'))), {
                typeToken: 'type',
                typeNameToken: 'MyType',
                typeParamList: {},
                equalsToken: '=',
                typeNode: {},
            });
        });

        it('should parse ExportDeclaration', () => {
            assert.containSubset(nodeToObject(pars.acceptExportDeclaration(new Parser('export default a'))), {
                exportToken: 'export',
                exportName: {},
                exportValue: {},
            });
        });

        it('should parse Declaration', () => {
            assert.containSubset(nodeToObject(pars.acceptDeclaration(new Parser('func int a() => b'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptDeclaration(new Parser('type MyType = int'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptDeclaration(new Parser('export default a'))), { choice: {} });
        });
    });

    describe('parsing types', () => {
        it('should parse Type', () => {
            // token-based type choices (mostly primitives)
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('u8'))), { choice: 'u8' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('i8'))), { choice: 'i8' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('byte'))), { choice: 'byte' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('u16'))), { choice: 'u16' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('i16'))), { choice: 'i16' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('short'))), { choice: 'short' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('u32'))), { choice: 'u32' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('i32'))), { choice: 'i32' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('integer'))), { choice: 'integer' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('u64'))), { choice: 'u64' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('i64'))), { choice: 'i64' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('long'))), { choice: 'long' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('int'))), { choice: 'int' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('f32'))), { choice: 'f32' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('float'))), { choice: 'float' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('f64'))), { choice: 'f64' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('double'))), { choice: 'double' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('char'))), { choice: 'char' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('string'))), { choice: 'string' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('bool'))), { choice: 'bool' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('void'))), { choice: 'void' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('any'))), { choice: 'any' });
            assert.deepEqual(nodeToObject(pars.acceptType(new Parser('MyType'))), { choice: 'MyType' });
            // complex types, just make sure that the choice is valid
            assert.containSubset(nodeToObject(pars.acceptType(new Parser('{}'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptType(new Parser('() => void'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptType(new Parser('(int)'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptType(new Parser('()'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptType(new Parser('MyType<>'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptType(new Parser('int[]'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptType(new Parser('int | string'))), { choice: {} });
        });

        it('should parse Field', () => {
            const parsed = pars.acceptField(new Parser('int i'));
            assert.containSubset(nodeToObject(parsed), {
                typeNode: {},
                nameToken: 'i',
            });
        });

        it('should parse StructType', () => {
            const parsed = pars.acceptStructType(new Parser('{ int i; int j }'));
            assert.containSubset(nodeToObject(parsed), {
                openBraceToken: '{',
                fields: { length: 2 },
                closeBraceToken: '}',
            });
        });

        it('should parse FunctionType', () => {
            const parsed = pars.acceptFunctionType(new Parser('(int, int) => int'));
            assert.containSubset(nodeToObject(parsed), {
                openParenToken: '(',
                paramTypes: { length: 2 },
                closeParenToken: ')',
                fatArrowToken: '=>',
                returnType: {},
            });
        });

        it('should parse ParenthesizedType', () => {
            const parsed = pars.acceptParenthesizedType(new Parser('(int)'));
            assert.containSubset(nodeToObject(parsed), {
                openParenToken: '(',
                inner: {},
                closeParenToken: ')',
            });
        });

        it('should parse TupleType', () => {
            const parsed = pars.acceptTupleType(new Parser('(int, int)'));
            assert.containSubset(nodeToObject(parsed), {
                openParenToken: '(',
                types: { length: 2 },
                closeParenToken: ')',
            });
        });

        it('should parse ArrayType', () => {
            // just left-recursive suffix
            let parsed: STType = pars.acceptArrayTypeSuffix(new Parser('[]'));
            assert.containSubset(nodeToObject(parsed), {
                openBracketToken: '[',
                closeBracketToken: ']',
            });
            // full type
            parsed = pars.acceptType(new Parser('int[]'));
            assert.containSubset(nodeToObject(parsed), {
                choice: {
                    baseType: {},
                    openBracketToken: '[',
                    closeBracketToken: ']',
                }
            });
        });

        it('should parse UnionType', () => {
            // just left-recursive suffix
            let parsed: STType = pars.acceptUnionTypeSuffix(new Parser('| string'));
            assert.containSubset(nodeToObject(parsed), {
                vbarToken: '|',
                right: {},
            });
            // full type
            parsed = pars.acceptType(new Parser('int | string'));
            assert.containSubset(nodeToObject(parsed), {
                choice: {
                    left: {},
                    vbarToken: '|',
                    right: {},
                }
            });
        });
        
        it('should accept TypeArgList', () => {
            const parsed = pars.acceptTypeArgList(new Parser('<int, int>'));
            assert.containSubset(nodeToObject(parsed), {
                openLtToken: '<',
                types: { length: 2 },
                closeGtToken: '>',
            });
        });

        it('should parse SpecificType', () => {
            // just left-recursive suffix
            let parsed: STType = pars.acceptSpecificTypeSuffix(new Parser('<int, string, void>'));
            assert.containSubset(nodeToObject(parsed), {
                typeArgList: {},
            });
            // full type
            parsed = pars.acceptType(new Parser('MyType<int, string, void>'));
            assert.containSubset(nodeToObject(parsed), {
                choice: {
                    typeNode: {},
                    typeArgList: {},
                }
            });
        });
    });

    describe('parsing expressions', () => {
        it('should parse Expression', () => {
            // token-based expression choices (mostly just literals)
            assert.deepEqual(nodeToObject(pars.acceptExpression(new Parser('1'))), { choice: '1' });
            assert.deepEqual(nodeToObject(pars.acceptExpression(new Parser('1.5'))), { choice: '1.5' });
            assert.deepEqual(nodeToObject(pars.acceptExpression(new Parser('""'))), { choice: '""' });
            assert.deepEqual(nodeToObject(pars.acceptExpression(new Parser("'a'"))), { choice: "'a'" });
            assert.deepEqual(nodeToObject(pars.acceptExpression(new Parser('true'))), { choice: 'true' });
            assert.deepEqual(nodeToObject(pars.acceptExpression(new Parser('false'))), { choice: 'false' });
            assert.deepEqual(nodeToObject(pars.acceptExpression(new Parser('a'))), { choice: 'a' });
            // complex expressions, just make sure the choice is valid
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('a = 1'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('a => 1'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('[]'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('{}'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('if (1) 2 else 3'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('+1'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('() => a'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('(1)'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('()'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('a()'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('1+1'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('1+'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('a.a'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('a[1]'))), { choice: {} });
        });

        it('should parse VarDeclaration', () => {
            assert.containSubset(nodeToObject(pars.acceptVarDeclaration(new Parser('a = 1'))), {
                varIdentToken: 'a',
                equalsToken: '=',
                initialValue: {},
            });
        });

        it('should parse shorthand LambdaExpression', () => {
            assert.containSubset(nodeToObject(pars.acceptShorthandLambdaExpression(new Parser('a => 1'))), {
                shorthandParam: 'a',
                fatArrowToken: '=>',
                functionBody: {},
            });
        });

        it('should parse ArrayLiteral', () => {
            assert.deepEqual(nodeToObject(pars.acceptArrayLiteral(new Parser('[]'))), {
                openBracketToken: '[',
                commaTokens: [],
                items: [],
                closeBracketToken: ']',
            });
            assert.containSubset(nodeToObject(pars.acceptArrayLiteral(new Parser('[1, 2]'))), {
                openBracketToken: '[',
                items: { length: 2 },
                closeBracketToken: ']',
            });
        });

        it('should parse StructEntry', () => {
            assert.containSubset(nodeToObject(pars.acceptStructEntry(new Parser('a: 1'))), {
                keyToken: 'a',
                colonToken: ':',
                value: {},
            });
        });

        it('should parse StructLiteral', () => {
            assert.deepEqual(nodeToObject(pars.acceptStructLiteral(new Parser('{}'))), {
                openBraceToken: '{',
                commaTokens: [],
                entries: [],
                closeBraceToken: '}',
            });
            assert.containSubset(nodeToObject(pars.acceptStructLiteral(new Parser('{ a: 1, b: 2 }'))), {
                openBraceToken: '{',
                entries: { length: 2 },
                closeBraceToken: '}',
            });
        });

        it('should parse IfElseExpression', () => {
            assert.containSubset(nodeToObject(pars.acceptIfElseExpression(new Parser('if (1) 2 else 3'))), {
                ifToken: 'if',
                openParenToken: '(',
                condition: {},
                closeParenToken: ')',
                consequent: {},
                elseToken: 'else',
                alternate: {},
            });
        });

        it('should parse PrefixExpression', () => {
            assert.containSubset(nodeToObject(pars.acceptPrefixExpression(new Parser('+1'))), {
                operatorToken: ['+'],
                target: {},
            });
        });

        it('should parse LambdaParam', () => {
            assert.deepEqual(nodeToObject(pars.acceptLambdaParam(new Parser('a'))), { choice: 'a' });
            assert.containSubset(nodeToObject(pars.acceptLambdaParam(new Parser('int a'))), { choice: {} });
        });

        it('should parse LambdaExpression', () => {
            assert.containSubset(nodeToObject(pars.acceptLambdaExpression(new Parser('() => a'))), {
                openParenToken: '(',
                closeParenToken: ')',
                fatArrowToken: '=>',
                functionBody: {},
            });
            assert.containSubset(nodeToObject(pars.acceptLambdaExpression(new Parser('(a, b) => c'))), {
                openParenToken: '(',
                params: { length: 2 },
                closeParenToken: ')',
                fatArrowToken: '=>',
                functionBody: {},
            });
        });

        it('should parse ParenthesizedExpression', () => {
            assert.containSubset(nodeToObject(pars.acceptParenthesizedExpression(new Parser('(1)'))), {
                openParenToken: '(',
                inner: {},
                closeParenToken: ')',
            });
        });

        it('should parse TupleLiteral', () => {
            assert.deepEqual(nodeToObject(pars.acceptTupleLiteral(new Parser('()'))), {
                openParenToken: '(',
                commaTokens: [],
                items: [],
                closeParenToken: ')',
            });
            assert.containSubset(nodeToObject(pars.acceptTupleLiteral(new Parser('(1, 2)'))), {
                openParenToken: '(',
                items: { length: 2 },
                closeParenToken: ')',
            });
        });

        it('should parse FunctionApplication', () => {
            // just suffix
            assert.containSubset(nodeToObject(pars.acceptFunctionApplicationSuffix(new Parser('(1, 2)'))), {
                openParenToken: '(',
                args: { length: 2 },
                closeParenToken: ')',
            });
            // suffix with type arg list
            assert.containSubset(nodeToObject(pars.acceptFunctionApplicationSuffix(new Parser('<>()'))), {
                typeArgList: {},
                openParenToken: '(',
                closeParenToken: ')',
            });
            // full expression
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('1<>()'))), {
                choice: {
                    target: {},
                    typeArgList: {},
                    openParenToken: '(',
                    closeParenToken: ')',
                },
            });
        });

        it('should parse BinaryExpression', () => {
            // just suffix
            assert.containSubset(nodeToObject(pars.acceptBinaryExpressionSuffix(new Parser('+1'))), {
                operatorToken: ['+'],
                right: {},
            });
            // full expression
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('1+1'))), {
                choice: {
                    left: {},
                    operatorToken: ['+'],
                    right: {},
                },
            });
        });

        it('should parse PostfixExpression', () => {
            // just suffix
            assert.deepEqual(nodeToObject(pars.acceptPostfixExpressionSuffix(new Parser('+'))), {
                operatorToken: ['+'],
            });
            // full expression
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('1+'))), {
                choice: {
                    target: {},
                    operatorToken: ['+'],
                },
            });
        });

        it('should parse FieldAccess', () => {
            // just suffix
            assert.deepEqual(nodeToObject(pars.acceptFieldAccessSuffix(new Parser('.a'))), {
                dotToken: '.',
                fieldNameToken: 'a',
            });
            // full expression
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('1.a'))), {
                choice: {
                    target: {},
                    dotToken: '.',
                    fieldNameToken: 'a',
                },
            });
        });

        it('should parse ArrayAccess', () => {
            // just suffix
            assert.containSubset(nodeToObject(pars.acceptArrayAccessSuffix(new Parser('[1]'))), {
                openBracketToken: '[',
                indexExp: {},
                closeBracketToken: ']',
            });
            // full expression
            assert.containSubset(nodeToObject(pars.acceptExpression(new Parser('1[1]'))), {
                choice: {
                    target: {},
                    openBracketToken: '[',
                    indexExp: {},
                    closeBracketToken: ']',
                },
            });
        });
    });

    describe('parsing statements', () => {
        it('should parse Statement', () => {
            // just make sure the choice is valid
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('{}'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('1'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('for (a in b) c'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('while (a) b'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('do a while (b)'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('try a catch (b c) d'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('return'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('throw a'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('break'))), { choice: {} });
            assert.containSubset(nodeToObject(pars.acceptStatement(new Parser('continue'))), { choice: {} });
        });

        it('should parse Block', () => {
            assert.deepEqual(nodeToObject(pars.acceptBlock(new Parser('{}'))), {
                openBraceToken: '{',
                statements: [],
                closeBraceToken: '}',
            });
        });

        it('should parse ForStatement', () => {
            assert.containSubset(nodeToObject(pars.acceptForStatement(new Parser('for (a in b) c'))), {
                forToken: 'for',
                openParenToken: '(',
                iterVarToken: 'a',
                inToken: 'in',
                iterableExp: {},
                closeParenToken: ')',
                body: {},
            });
        });

        it('should parse WhileStatement', () => {
            assert.containSubset(nodeToObject(pars.acceptWhileStatement(new Parser('while (a) b'))), {
                whileToken: 'while',
                openParenToken: '(',
                conditionExp: {},
                closeParenToken: ')',
                body: {},
            });
        });

        it('should parse DoWhileStatement', () => {
            assert.containSubset(nodeToObject(pars.acceptDoWhileStatement(new Parser('do a while (b)'))), {
                doToken: 'do',
                body: {},
                whileToken: 'while',
                openParenToken: '(',
                conditionExp: {},
                closeParenToken: ')',
            });
        });

        it('should parse CatchClause', () => {
            assert.containSubset(nodeToObject(pars.acceptCatchClause(new Parser('catch (a b) c'))), {
                catchToken: 'catch',
                openParenToken: '(',
                param: {},
                closeParenToken: ')',
                body: {},
            });
        });

        it('should parse FinallyClause', () => {
            assert.containSubset(nodeToObject(pars.acceptFinallyClause(new Parser('finally a'))), {
                finallyToken: 'finally',
                body: {},
            });
        });

        it('should parse TryCatchStatement', () => {
            assert.containSubset(nodeToObject(pars.acceptTryCatchStatement(new Parser('try a catch (b c) d'))), {
                tryToken: 'try',
                tryBody: {},
                catches: { length: 1 },
            });
            assert.containSubset(nodeToObject(pars.acceptTryCatchStatement(new Parser('try a catch (b c) d catch (e f) g'))), {
                tryToken: 'try',
                tryBody: {},
                catches: { length: 2 },
            });
            assert.containSubset(nodeToObject(pars.acceptTryCatchStatement(new Parser('try a catch (b c) d finally e'))), {
                tryToken: 'try',
                tryBody: {},
                catches: { length: 1 },
                finally: {},
            });
        });

        it('should parse ReturnStatement', () => {
            assert.containSubset(nodeToObject(pars.acceptReturnStatement(new Parser('return a'))), {
                returnToken: 'return',
                exp: {}
            });
            assert.deepEqual(nodeToObject(pars.acceptReturnStatement(new Parser('return'))), {
                returnToken: 'return',
            });
        });

        it('should parse ThrowStatement', () => {
            assert.containSubset(nodeToObject(pars.acceptThrowStatement(new Parser('throw a'))), {
                throwToken: 'throw',
                exp: {},
            });
        });

        it('should parse BreakStatement', () => {
            assert.deepEqual(nodeToObject(pars.acceptBreakStatement(new Parser('break'))), {
                breakToken: 'break',
            });
            assert.deepEqual(nodeToObject(pars.acceptBreakStatement(new Parser('break 2'))), {
                breakToken: 'break',
                loopNumber: '2',
            });
        });

        it('should parse ContinueStatement', () => {
            assert.deepEqual(nodeToObject(pars.acceptContinueStatement(new Parser('continue'))), {
                continueToken: 'continue',
            });
            assert.deepEqual(nodeToObject(pars.acceptContinueStatement(new Parser('continue 2'))), {
                continueToken: 'continue',
                loopNumber: '2',
            });
        });
    });
});
