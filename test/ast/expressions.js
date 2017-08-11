import { expect } from 'chai';

import * as exps from '../../src/ast/expressions';
import { Token } from '../../src/parser/Tokenizer';
import { TInteger, TChar, TBool, TTuple, TStruct, TArray, TUnknown } from '../../src/typecheck/types';


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
        it('should reduce to an integer literal');

        it('should reduce to a float literal');

        it('should reduce to a character literal');

        it('should reduce to a string literal');

        it('should reduce to a bool literal');

        it('should reduce to an identifier');

        it('should reduce to an array literal');

        it('should reduce to a tuple literal');

        it('should reduce to a struct literal');

        it('should reduce to a lambda expression');

        it('should reduce to a unary expression');

        it('should reduce to a binary expression');

        it('should reduce to an if-else expression');

        it('should reduce to a variable declaration');

        it('should reduce to a function application');

        it('should reduce to a field access');

        it('should reduce to an array access');

        it('should reduce to a parenthesized expression');

        it('should error on an invalid expression node');

        it('should resolve the type of a parenthesized expression');
    });

    describe('IntegerLiteral', () => {
        it('should estimate type of negative literals');

        it('should estimate type of positive literals');
    });

    describe('FloatLiteral', () => {
        it('should estimate type of float literals');
    });

    describe('CharLiteral', () => {
        it('should resolve type of char literals');
    });

    describe('StringLiteral', () => {
        it('should resolve type of string literals');
    });

    describe('BoolLiteral', () => {
        it('should resolve type of bool literals');
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
