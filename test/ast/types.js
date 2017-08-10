import { expect } from 'chai';

import * as types from '../../src/ast/types';
import { Token } from '../../src/parser/Tokenizer';
import { TInteger, TFloat, TChar, TBool, TTuple, TArray, TFunction, TAny, TUnknown } from '../../src/typecheck/types';


const int = new TInteger(32, true);
const loc = { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };

function getDummyNode(contents = {}) {
    return { reduce: () => contents };
}

function getDummyReducedNode(type, locations = {}) {
    return {
        locations,
        resolveType: () => type,
    };
}

describe('Type Nodes', () => {
    describe('Type', () => {
        it('should reduce to a primitive type node', () => {
            const type = new types.Type({ builtIn: new Token('INT', 1, 1, 'int') });
            expect(type.reduce()).to.eql(new types.PrimitiveType('int', { ...loc, endColumn: 3 }));
        });

        it('should reduce to an identifier type node', () => {
            const type = new types.Type({ name: new Token('IDENT', 1, 1, 'myType') });
            expect(type.reduce()).to.eql(new types.IdentifierType('myType', { ...loc, endColumn: 6 }));
        });

        it('should reduce to a function type node', () => {
            const type = new types.Type({ functionType: getDummyNode({ name: 'myFunc' }) });
            expect(type.reduce()).to.eql({ name: 'myFunc' });
        });

        it('should reduce to a tuple type node', () => {
            const type = new types.Type({ tupleType: getDummyNode({ name: 'myTuple' }) });
            expect(type.reduce()).to.eql({ name: 'myTuple' });
        });

        it('should reduce to a struct type node', () => {
            const type = new types.Type({ structType: getDummyNode({ name: 'myStruct' }) });
            expect(type.reduce()).to.eql({ name: 'myStruct' });
        });

        it('should reduce to a array type node', () => {
            const type = new types.Type({ arrayType: getDummyNode({ name: 'myArray' }) });
            expect(type.reduce()).to.eql({ name: 'myArray' });
        });

        it('should reduce to a union type node', () => {
            const type = new types.Type({ unionType: getDummyNode({ name: 'myUnion' }) });
            expect(type.reduce()).to.eql({ name: 'myUnion' });
        });

        it('should reduce to a parenthesized type node', () => {
            const type = new types.Type({
                openParenToken: new Token('LPAREN', 1, 1, '('),
                innerType: getDummyNode(),
                closeParenToken: new Token('RPAREN', 1, 2, '('),
            });
            expect(type.reduce()).to.eql(new types.Type({
                parenthesized: {},
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should throw an error for an invalid type node', () => {
            expect(() => new types.Type({}).reduce()).to.throw('Invalid Type node');
        });

        it('should resolve type of parenthesized type node', () => {
            const type = new types.Type({ parenthesized: getDummyReducedNode(int) });
            expect(type.resolveType({}, {})).to.eql(int);
        });
    });

    describe('PrimitiveType', () => {
        it('should resolve primitive types', () => {
            expect(new types.PrimitiveType('u8', loc).resolveType({}, {})).to.eql(new TInteger(8, false));
            expect(new types.PrimitiveType('byte', loc).resolveType({}, {})).to.eql(new TInteger(8, false));
            expect(new types.PrimitiveType('i8', loc).resolveType({}, {})).to.eql(new TInteger(8, true));
            expect(new types.PrimitiveType('u16', loc).resolveType({}, {})).to.eql(new TInteger(16, false));
            expect(new types.PrimitiveType('short', loc).resolveType({}, {})).to.eql(new TInteger(16, false));
            expect(new types.PrimitiveType('i16', loc).resolveType({}, {})).to.eql(new TInteger(16, true));
            expect(new types.PrimitiveType('u32', loc).resolveType({}, {})).to.eql(new TInteger(32, false));
            expect(new types.PrimitiveType('i32', loc).resolveType({}, {})).to.eql(new TInteger(32, true));
            expect(new types.PrimitiveType('integer', loc).resolveType({}, {})).to.eql(new TInteger(32, true));
            expect(new types.PrimitiveType('u64', loc).resolveType({}, {})).to.eql(new TInteger(64, false));
            expect(new types.PrimitiveType('i64', loc).resolveType({}, {})).to.eql(new TInteger(64, true));
            expect(new types.PrimitiveType('long', loc).resolveType({}, {})).to.eql(new TInteger(64, true));
            expect(new types.PrimitiveType('int', loc).resolveType({}, {})).to.eql(new TInteger(Infinity, true));
            expect(new types.PrimitiveType('f32', loc).resolveType({}, {})).to.eql(new TFloat(32));
            expect(new types.PrimitiveType('float', loc).resolveType({}, {})).to.eql(new TFloat(32));
            expect(new types.PrimitiveType('f64', loc).resolveType({}, {})).to.eql(new TFloat(64));
            expect(new types.PrimitiveType('double', loc).resolveType({}, {})).to.eql(new TFloat(64));
            expect(new types.PrimitiveType('char', loc).resolveType({}, {})).to.eql(new TChar());
            expect(new types.PrimitiveType('string', loc).resolveType({}, {})).to.eql(new TArray(new TChar()));
            expect(new types.PrimitiveType('bool', loc).resolveType({}, {})).to.eql(new TBool());
            expect(new types.PrimitiveType('void', loc).resolveType({}, {})).to.eql(new TTuple([]));
            expect(new types.PrimitiveType('any', loc).resolveType({}, {})).to.eql(new TAny());
        });

        it('should throw an error for invalid built-in type', () => {
            expect(() => new types.PrimitiveType('awef', loc).resolveType()).to.throw('Invalid built-in type awef');
        });
    });
});
