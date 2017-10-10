import { expect } from 'chai';

import * as types from '../../src/ast/types';
import { Token } from '../../src/parser/Tokenizer';
import { TInteger, TFloat, TChar, TBool, TTuple, TStruct, TArray, TFunction, TUnion, TAny, TUnknown } from '../../src/typecheck/types';


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

function getDummyTypeChecker(type) {
    return {
        getType: () => type,
    };
}

describe('Type Nodes', () => {
    describe('Type', () => {
        it('should reduce to a primitive type node', () => {
            const type = new types.Type({ builtIn: new Token('INT', 1, 1, 'int') });
            expect(type.reduce()).to.eql(new types.PrimitiveType('int', { ...loc, endColumn: 3 }));
        });

        it('should reduce to an identifier type node', () => {
            const type = new types.Type({ nameToken: new Token('IDENT', 1, 1, 'myType') });
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
            const type = new types.Type({ parenthesized: getDummyNode() });
            expect(type.reduce()).to.eql({});
        });

        it('should throw an error for an invalid type node', () => {
            expect(() => new types.Type({}).reduce()).to.throw('Invalid Type node');
        });
    });

    describe('ParenthesizedType', () => {
        it('should reduce a parenthesized type', () => {
            const t = new types.ParenthesizedType({
                openParenToken: new Token('LPAREN', 1, 1, '('),
                inner: getDummyNode(),
                closeParenToken: new Token('RPAREN', 1, 2, ')'),
            });
            expect(t.reduce()).to.eql(new types.ParenthesizedType({
                inner: {},
                locations: { self: { ...loc, endColumn: 2 } },
            }));
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

    describe('IdentifierType', () => {
        it('should add an error for an undefined type', () => {
            const type = new types.IdentifierType('myType', loc);
            const module = { types: {}, path: '/index.ren' };
            const typeChecker = { errors: [] };
            const resolved = type.resolveType(typeChecker, module, {});
            expect(resolved).to.eql(new TUnknown());
            expect(typeChecker.errors.length).to.eql(1);
            expect(typeChecker.errors[0].message).to.eql('Type "myType" is not defined [/index.ren:1:1]');
        });

        it('should resolve a defined type', () => {
            const type = new types.IdentifierType('myType', loc);
            const module = { types: { myType: {} } };
            const typeChecker = getDummyTypeChecker(int);
            expect(type.resolveType(typeChecker, module, {})).to.eql(int);
        });
    });

    describe('FunctionType', () => {
        it('should reduce a function type', () => {
            const returnTypeLocation = { ...loc, startColumn: 2, endColumn: 2 };
            const type = new types.FunctionType({
                openParenToken: new Token('LPAREN', 1, 1, '('),
                paramTypes: [getDummyNode()],
                returnType: getDummyNode({ locations: { self: returnTypeLocation } }),
            });
            expect(type.reduce()).to.eql(new types.FunctionType({
                paramTypes: [{}],
                returnType: { locations: { self: returnTypeLocation } },
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should resolve a function type', () => {
            const type = new types.FunctionType({
                paramTypes: [getDummyReducedNode(int)],
                returnType: getDummyReducedNode(int),
            });
            expect(type.resolveType({}, {})).to.eql(new TFunction([int], int));
        });

        it('should resolve to unknown for unknown params', () => {
            const type = new types.FunctionType({
                paramTypes: [getDummyReducedNode(new TUnknown())],
                returnType: getDummyReducedNode(int),
            });
            expect(type.resolveType({}, {})).to.eql(new TUnknown());
        });

        it('should resolve to unknown for unknown return type', () => {
            const type = new types.FunctionType({
                paramTypes: [getDummyReducedNode(int)],
                returnType: getDummyReducedNode(new TUnknown()),
            });
            expect(type.resolveType({}, {})).to.eql(new TUnknown());
        });
    });

    describe('TupleType', () => {
        it('should reduce a tuple type', () => {
            const type = new types.TupleType({
                openParenToken: new Token('LPAREN', 1, 1, '('),
                types: [getDummyNode(), getDummyNode()],
                closeParenToken: new Token('RPAREN', 1, 2, ')'),
            });
            expect(type.reduce()).to.eql(new types.FunctionType({
                types: [{}, {}],
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should resolve a tuple type', () => {
            const type = new types.TupleType({
                types: [getDummyReducedNode(int), getDummyReducedNode(int)],
            });
            expect(type.resolveType({}, {})).to.eql(new TTuple([int, int]));
        });

        it('should resolve to unknown for unknown component type', () => {
            const type = new types.TupleType({
                types: [getDummyReducedNode(new TUnknown()), getDummyReducedNode(int)],
            });
            expect(type.resolveType({}, {})).to.eql(new TUnknown());
        });
    });

    describe('StructType', () => {
        it('should reduce a struct type', () => {
            const type = new types.StructType({
                openBraceToken: new Token('LBRACE', 1, 1, '{'),
                fields: [new types.Field({ typeNode: getDummyNode(), nameToken: new Token('IDENT', 1, 2, 'myField') })],
                closeBraceToken: new Token('RBRACE', 1, 9, '}'),
            });
            expect(type.reduce()).to.eql(new types.StructType({
                fields: [{ type: {}, name: 'myField' }],
                locations: {
                    self: { ...loc, endColumn: 9 },
                    field_myField: { ...loc, startColumn: 2, endColumn: 8 },
                },
            }));
        });

        it('should resolve a struct type', () => {
            const type = new types.StructType({
                fields: [{ type: getDummyReducedNode(int), name: 'myField' }],
            });
            expect(type.resolveType({}, {})).to.eql(new TStruct({ myField: int }));
        });

        it('should add an error for duplicate field names', () => {
            const type = new types.StructType({
                fields: [
                    { type: getDummyReducedNode(int), name: 'myField' },
                    { type: getDummyReducedNode(int), name: 'myField' },
                ],
                locations: {
                    field_myField: loc,
                },
            });
            const typeChecker = { errors: [] };
            expect(type.resolveType(typeChecker, { path: '/index.ren' })).to.eql(new TUnknown());
            expect(typeChecker.errors.length).to.eql(1);
            expect(typeChecker.errors[0].message).to.eql('A value with name "myField" is already declared [/index.ren:1:1]');
        });

        it('should resolve to unknown for an unknown field type', () => {
            const type = new types.StructType({
                fields: [{ type: getDummyReducedNode(new TUnknown()), name: 'myField' }],
            });
            expect(type.resolveType({}, {})).to.eql(new TUnknown());
        });
    });

    describe('ArrayType', () => {
        it('should reduce an array type', () => {
            const type = new types.ArrayType({
                baseType: getDummyNode({ locations: { self: loc } }),
                closeBracketToken: new Token('RBRACK', 1, 2, ']'),
            });
            expect(type.reduce()).to.eql(new types.ArrayType({
                baseType: { locations: { self: loc } },
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should resolve an array type', () => {
            const type = new types.ArrayType({ baseType: getDummyReducedNode(int) });
            expect(type.resolveType({}, {})).to.eql(new TArray(int));
        });

        it('should resolve to unknown for an unknown base type', () => {
            const type = new types.ArrayType({ baseType: getDummyReducedNode(new TUnknown()) });
            expect(type.resolveType({}, {})).to.eql(new TUnknown());
        });
    });

    describe('UnionType', () => {
        it('should reduce a union type', () => {
            const rightLocation = { ...loc, startColumn: 2, endColumn: 2 };
            const type = new types.UnionType({
                left: getDummyNode({ locations: { self: loc } }),
                right: getDummyNode({ locations: { self: rightLocation } }),
            });
            expect(type.reduce()).to.eql(new types.UnionType({
                types: [{ locations: { self: loc } }, { locations: { self: rightLocation } }],
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should reduce deep union types', () => {
            // these are dummy reduced types
            const left = new types.UnionType({ types: [{ a: 1 }, { b: 2 }], locations: { self: loc } });
            const right = new types.UnionType({ types: [{ c: 3 }, { d: 4 }], locations: { self: { ...loc, startColumn: 2, endColumn: 2 } } });
            // this is the non-reduced type being tested
            const type = new types.UnionType({ left: getDummyNode(left), right: getDummyNode(right) });
            expect(type.reduce()).to.eql(new types.UnionType({
                types: [{ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }],
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should resolve a union type', () => {
            const type = new types.UnionType({ types: [getDummyReducedNode(int), getDummyReducedNode(int)] });
            expect(type.resolveType({}, {})).to.eql(new TUnion([int, int]));
        });

        it('should resolve to unknown for an unknown component type', () => {
            const type = new types.UnionType({ types: [getDummyReducedNode(int), getDummyReducedNode(new TUnknown())] });
            expect(type.resolveType({}, {})).to.eql(new TUnknown());
        });
    });

    describe('SpecificType', () => {
        it('should reduce a specific type', () => {
            const type = new types.SpecificType({
                nameToken: new Token('IDENT', 1, 1, 'MyType'),
                typeArgList: new types.TypeArgList({
                    types: [getDummyNode(), getDummyNode()],
                    closeGtToken: new Token('OPER', 1, 7, '>'),
                }),
            });
            expect(type.reduce()).to.eql(new types.SpecificType({
                name: 'MyType',
                typeArgs: [{}, {}],
                locations: { name: { ...loc, endColumn: 6 }, self: { ...loc, endColumn: 7 } },
            }));
        });
    });
});
