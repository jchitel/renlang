import { expect } from 'chai';

import * as exps from '../../src/ast/expressions';
import { Token } from '../../src/parser/Tokenizer';
import { TInteger, TFloat, TChar, TBool, TTuple, TStruct, TArray, TUnknown } from '../../src/typecheck/types';


const int = new TInteger(32, true);
const loc = { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };

function getDummyNode(contents = {}) {
    return { reduce: () => contents };
}

function getDummyReducedNode(type, fields = {}, symbolTable = null) {
    return {
        ...fields,
        resolveType: (tc, m, st) => {
            if (symbolTable) Object.assign(symbolTable, st);
            return type;
        },
    };
}

describe('Expression Nodes', () => {
    describe('Expression', () => {
        it('should reduce to an integer literal', () => {
            const exp = new exps.Expression({
                integerLiteralToken: new Token('INTEGER_LITERAL', 1, 1, '1', 1),
            });
            expect(exp.reduce()).to.eql(new exps.IntegerLiteral(1, loc));
        });

        it('should reduce to a float literal', () => {
            const exp = new exps.Expression({
                floatLiteralToken: new Token('FLOAT_LITERAL', 1, 1, '1.2', 1.2),
            });
            expect(exp.reduce()).to.eql(new exps.FloatLiteral(1.2, { ...loc, endColumn: 3 }));
        });

        it('should reduce to a character literal', () => {
            const exp = new exps.Expression({
                charLiteralToken: new Token('CHAR_LITERAL', 1, 1, "'a'", 'a'),
            });
            expect(exp.reduce()).to.eql(new exps.CharLiteral('a', { ...loc, endColumn: 3 }));
        });

        it('should reduce to a string literal', () => {
            const exp = new exps.Expression({
                stringLiteralToken: new Token('STRING_LITERAL', 1, 1, '"abc"', 'abc'),
            });
            expect(exp.reduce()).to.eql(new exps.StringLiteral('abc', { ...loc, endColumn: 5 }));
        });

        it('should reduce to a bool literal', () => {
            const exp = new exps.Expression({
                boolLiteralToken: new Token('TRUE', 1, 1, 'true', true),
            });
            expect(exp.reduce()).to.eql(new exps.IntegerLiteral(1, loc));
        });

        it('should reduce to an identifier', () => {
            const exp = new exps.Expression({
                identToken: new Token('IDENT', 1, 1, 'myIdent'),
            });
            expect(exp.reduce()).to.eql(new exps.IdentifierExpression('myIdent', { ...loc, endColumn: 7 }));
        });

        it('should reduce to an array literal', () => {
            const exp = new exps.Expression({
                arrayLiteral: getDummyNode({ array: [] }),
            });
            expect(exp.reduce()).to.eql({ array: [] });
        });

        it('should reduce to a tuple literal', () => {
            const exp = new exps.Expression({
                tupleLiteral: getDummyNode({ tuple: [] }),
            });
            expect(exp.reduce()).to.eql({ tuple: [] });
        });

        it('should reduce to a struct literal', () => {
            const exp = new exps.Expression({
                structLiteral: getDummyNode({ struct: {} }),
            });
            expect(exp.reduce()).to.eql({ struct: {} });
        });

        it('should reduce to a lambda expression', () => {
            const exp = new exps.Expression({
                lambda: getDummyNode({ lambda: {} }),
            });
            expect(exp.reduce()).to.eql({ lambda: {} });
        });

        it('should reduce to a unary expression', () => {
            const exp = new exps.Expression({
                unary: getDummyNode({ unary: {} }),
            });
            expect(exp.reduce()).to.eql({ unary: {} });
        });

        it('should reduce to a binary expression', () => {
            const exp = new exps.Expression({
                binary: getDummyNode({ binary: {} }),
            });
            expect(exp.reduce()).to.eql({ binary: {} });
        });

        it('should reduce to an if-else expression', () => {
            const exp = new exps.Expression({
                ifElse: getDummyNode({ ifElse: {} }),
            });
            expect(exp.reduce()).to.eql({ ifElse: {} });
        });

        it('should reduce to a variable declaration', () => {
            const exp = new exps.Expression({
                varDecl: getDummyNode({ varDecl: {} }),
            });
            expect(exp.reduce()).to.eql({ varDecl: {} });
        });

        it('should reduce to a function application', () => {
            const exp = new exps.Expression({
                functionApplication: getDummyNode({ functionApplication: {} }),
            });
            expect(exp.reduce()).to.eql({ functionApplication: {} });
        });

        it('should reduce to a field access', () => {
            const exp = new exps.Expression({
                fieldAccess: getDummyNode({ fieldAccess: {} }),
            });
            expect(exp.reduce()).to.eql({ fieldAccess: {} });
        });

        it('should reduce to an array access', () => {
            const exp = new exps.Expression({
                arrayAccess: getDummyNode({ arrayAccess: {} }),
            });
            expect(exp.reduce()).to.eql({ arrayAccess: {} });
        });

        it('should reduce to a parenthesized expression', () => {
            const exp = new exps.Expression({
                openParenToken: new Token('LPAREN', 1, 1, '('),
                innerExpression: getDummyNode(),
                closeParenToken: new Token('RPAREN', 1, 2, ')'),
            });
            expect(exp.reduce()).to.eql(new exps.Expression({
                parenthesized: {},
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should error on an invalid expression node', () => {
            expect(() => new exps.Expression({ awef: {} }).reduce()).to.throw('Invalid Expression node');
        });

        it('should resolve the type of a parenthesized expression', () => {
            expect(new exps.Expression({ parenthesized: getDummyReducedNode(int) }).resolveType({}, {}, {})).to.eql(int);
        });
    });

    describe('IntegerLiteral', () => {
        it('should estimate type of negative literals', () => {
            expect(new exps.IntegerLiteral(-100).resolveType()).to.eql(new TInteger(8, true));
            expect(new exps.IntegerLiteral(-10000).resolveType()).to.eql(new TInteger(16, true));
            expect(new exps.IntegerLiteral(-100000000).resolveType()).to.eql(new TInteger(32, true));
            expect(new exps.IntegerLiteral(-100000000000).resolveType()).to.eql(new TInteger(64, true));
        });

        it('should estimate type of positive literals', () => {
            expect(new exps.IntegerLiteral(100).resolveType()).to.eql(new TInteger(8, false));
            expect(new exps.IntegerLiteral(10000).resolveType()).to.eql(new TInteger(16, false));
            expect(new exps.IntegerLiteral(100000000).resolveType()).to.eql(new TInteger(32, false));
            expect(new exps.IntegerLiteral(100000000000).resolveType()).to.eql(new TInteger(64, false));
        });
    });

    describe('FloatLiteral', () => {
        it('should estimate type of float literals', () => {
            expect(new exps.FloatLiteral(1.2).resolveType()).to.eql(new TFloat(64));
        });
    });

    describe('CharLiteral', () => {
        it('should resolve type of char literals', () => {
            expect(new exps.CharLiteral('a').resolveType()).to.eql(new TChar());
        });
    });

    describe('StringLiteral', () => {
        it('should resolve type of string literals', () => {
            expect(new exps.StringLiteral('abc').resolveType()).to.eql(new TArray(new TChar()));
        });
    });

    describe('BoolLiteral', () => {
        it('should resolve type of bool literals', () => {
            expect(new exps.BoolLiteral('true').resolveType()).to.eql(new TBool());
        });
    });

    describe('IdentifierExpression', () => {
        it('should use symbol table to resolve type');

        it('should use module to resolve type');

        it('should add error for undefined value');
    });

    describe('ArrayLiteral', () => {
        it('should reduce array literal');

        it('should resolve type of array literal');

        it('should determine general type for different element types');
    });

    describe('TupleLiteral', () => {
        it('should reduce tuple literal');

        it('should resolve type of tuple literal');
    });

    describe('StructLiteral', () => {
        it('should reduce struct literal');

        it('should resolve type of struct literal');
    });

    describe('LambdaExpression', () => {
        it('should reduce lambda expression');

        it('should handle paren-less single parameter');

        it('should handle type-less parameters');

        it('should resolve type of lambda expression');

        it('should resolve type of lambda expression body');

        it('should error for mismatched lambda body type');
    });

    describe('UnaryExpression', () => {
        it('should reduce prefix expression');

        it('should reduce postfix expression');

        it('should resolve type of prefix expression');

        it('should resolve type of postfix expression');

        it('should error for non-existent operator');

        it('should error for invalid target expression');
    });

    describe('BinaryExpression', () => {
        it('should reduce binary expression');

        it('should resolve type of simple binary expression');

        it('should error for non-existent operator');

        it('should error for invalid target expressions');

        describe('operator precedence resolution', () => {
            it('should resolve when right expression has lower precedence');

            it('should resolve when right expression has higher precedence');

            it('should resolve when right expression has left associativity');

            it('should resolve when right expression has right associativity');

            it('should error when right expression has conflicting associativity');

            it('should resolve when left expression has lower precedence');

            it('should resolve when left expression has higher precedence');

            it('should resolve when left expression has left associativity');

            it('should resolve when left expression has right associativity');

            it('should error when left expression has conflicting associativity');

            it('should handle deeply nested binary expressions');
        });
    });

    describe('IfElseExpression', () => {
        it('should reduce if-else expression');

        it('should resolve type of if-else expression');

        it('should error when condition is not bool');
    });

    describe('VarDeclExpression', () => {
        it('should reduce var declaration');

        it('should resolve type of var declaration');

        it('should error when var already exists');
    });

    describe('FunctionApplication', () => {
        it('should reduce function application');

        it('should resolve type of function application');

        it('should return unknown for unknown target type');

        it('should error for non-function target type');

        it('should skip unknown argument values');

        it('should error for non-assignable argument values');

        it('should handle lambda expression arguments');
    });

    describe('FieldAccess', () => {
        it('should reduce field access');

        it('should resolve type of field access');

        it('should return unknown for unknown target type');

        it('should error for non-struct target type');

        it('should error for undefined field name');
    });

    describe('ArrayAccess', () => {
        it('should reduce array access');

        it('should resolve type of array access');

        it('should return unknown for unknown target type');

        it('should error for non-array target type');

        it('should ignore unknown index type');

        it('should error for non-integer index type');
    });
});
