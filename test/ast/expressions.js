import { expect } from 'chai';

import * as exps from '../../src/ast/expressions';
import { Token } from '../../src/parser/Tokenizer';
import { TInteger, TFloat, TChar, TBool, TTuple, TStruct, TArray, TFunction, TUnknown, TAny } from '../../src/typecheck/types';
import { operator, Operator } from '../../src/runtime/operators';


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

function getDummyTypeChecker(type) {
    return {
        errors: [],
        getValueType: () => type,
    };
}

function extractNonFunctions(obj) {
    const clone = Object.create(Object.getPrototypeOf(obj));
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'function') continue;
        if (typeof v !== 'object' || v === null) clone[k] = v;
        else clone[k] = extractNonFunctions(v);
    }
    return clone;
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
                characterLiteralToken: new Token('CHAR_LITERAL', 1, 1, "'a'", 'a'),
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
            expect(exp.reduce()).to.eql(new exps.BoolLiteral('true', { ...loc, endColumn: 4 }));
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
        it('should use symbol table to resolve type', () => {
            const symbolTable = { myIdent: int };
            expect(new exps.IdentifierExpression('myIdent').resolveType({}, {}, symbolTable)).to.eql(int);
        });

        it('should use module to resolve type', () => {
            const tc = getDummyTypeChecker(int);
            expect(new exps.IdentifierExpression('myIdent').resolveType(tc, {}, {})).to.eql(int);
        });

        it('should add error for undefined value', () => {
            const tc = getDummyTypeChecker(undefined);
            expect(new exps.IdentifierExpression('myIdent', loc).resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Value "myIdent" is not defined [/index.ren:1:1]']);
        });
    });

    describe('ArrayLiteral', () => {
        it('should reduce array literal', () => {
            const array = new exps.ArrayLiteral({
                openBracketToken: new Token('LBRACK', 1, 1, '['),
                items: [getDummyNode(), getDummyNode()],
                closeBracketToken: new Token('RBRACK', 1, 2, ']'),
            });
            expect(array.reduce()).to.eql(new exps.ArrayLiteral({
                items: [{}, {}],
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should resolve type of array literal', () => {
            const array = new exps.ArrayLiteral({
                items: [getDummyReducedNode(int), getDummyReducedNode(int)],
            });
            expect(array.resolveType({}, {}, {})).to.eql(new TArray(int));
        });

        it('should resolve type of empty array', () => {
            expect(new exps.ArrayLiteral({ items: [] }).resolveType({}, {}, {})).to.eql(new TArray(new TAny()));
        });
    });

    describe('TupleLiteral', () => {
        it('should reduce tuple literal', () => {
            const tuple = new exps.TupleLiteral({
                openParenToken: new Token('LPAREN', 1, 1, '('),
                items: [getDummyNode(), getDummyNode()],
                closeParenToken: new Token('RPAREN', 1, 2, ')'),
            });
            expect(tuple.reduce()).to.eql(new exps.TupleLiteral({
                items: [{}, {}],
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should resolve type of tuple literal', () => {
            const tuple = new exps.TupleLiteral({ items: [getDummyReducedNode(int), getDummyReducedNode(new TChar())] });
            expect(tuple.resolveType({}, {}, {})).to.eql(new TTuple([int, new TChar()]));
        });
    });

    describe('StructLiteral', () => {
        it('should reduce struct literal', () => {
            const struct = new exps.StructLiteral({
                openBraceToken: new Token('LBRACE', 1, 1, '{'),
                keyTokens: [new Token('IDENT', 1, 2, 'field1'), new Token('IDENT', 1, 8, 'field2')],
                values: [getDummyNode(), getDummyNode()],
                closeBraceToken: new Token('RBRACE', 1, 14, '}'),
            });
            expect(struct.reduce()).to.eql(new exps.StructLiteral({
                entries: [{ key: 'field1', value: {} }, { key: 'field2', value: {} }],
                locations: {
                    self: { ...loc, endColumn: 14 },
                    key_field1: { ...loc, startColumn: 2, endColumn: 7 },
                    key_field2: { ...loc, startColumn: 8, endColumn: 13 },
                },
            }));
        });

        it('should resolve type of struct literal', () => {
            const struct = new exps.StructLiteral({
                entries: [{ key: 'field1', value: getDummyReducedNode(int) }, { key: 'field2', value: getDummyReducedNode(new TChar()) }],
            });
            expect(struct.resolveType({}, {}, {})).to.eql(new TStruct({ field1: int, field2: new TChar() }));
        });
    });

    describe('LambdaExpression', () => {
        it('should reduce lambda expression', () => {
            const lambda = new exps.LambdaExpression({
                openParenToken: new Token('LPAREN', 1, 1, '('),
                paramList: new exps.LambdaParamList({
                    params: [
                        new exps.LambdaParam({ type: getDummyNode(), identifierToken: new Token('IDENT', 1, 2, 'p1') }),
                        new exps.LambdaParam({ identifierToken: new Token('IDENT', 1, 4, 'p2') }),
                    ],
                }),
                body: getDummyNode({ locations: { self: { ...loc, startColumn: 6, endColumn: 6 } } }),
            });
            expect(lambda.reduce()).to.eql(new exps.LambdaExpression({
                params: [
                    new exps.LambdaParam({ typeNode: {}, name: 'p1', locations: { name: { ...loc, startColumn: 2, endColumn: 3 } } }),
                    new exps.LambdaParam({ name: 'p2', locations: { name: { ...loc, startColumn: 4, endColumn: 5 } } }),
                ],
                body: { locations: { self: { ...loc, startColumn: 6, endColumn: 6 } } },
                locations: { self: { ...loc, endColumn: 6 } },
            }));
        });

        it('should handle paren-less single parameter', () => {
            const lambda = new exps.LambdaExpression({
                paramList: new exps.LambdaParamList({
                    params: [new exps.LambdaParam({ identifierToken: new Token('IDENT', 1, 1, 'p') })],
                }),
                body: getDummyNode({ locations: { self: { ...loc, startColumn: 2, endColumn: 2 } } }),
            });
            expect(lambda.reduce()).to.eql(new exps.LambdaExpression({
                params: [new exps.LambdaParam({ name: 'p', locations: { name: loc } })],
                body: { locations: { self: { ...loc, startColumn: 2, endColumn: 2 } } },
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should resolve type of lambda expression', () => {
            const lambda = new exps.LambdaExpression({
                params: [
                    new exps.LambdaParam({ typeNode: getDummyReducedNode(int), name: 'p1' }),
                    new exps.LambdaParam({ name: 'p2' }),
                ],
            });
            expect(lambda.resolveType({}, {}, {})).to.eql(new TFunction([int, null], null));
        });

        it('should resolve type of lambda expression body', () => {
            const lambda = new exps.LambdaExpression({
                params: [
                    new exps.LambdaParam({ name: 'p1' }),
                    new exps.LambdaParam({ name: 'p2' }),
                ],
                body: getDummyReducedNode(new TBool()),
                type: new TFunction([int, new TChar()], new TBool()),
            });
            const tc = getDummyTypeChecker();
            lambda.completeResolution(tc, {});
            expect(tc.errors).to.eql([]);
        });

        it('should error for mismatched lambda body type', () => {
            const lambda = new exps.LambdaExpression({
                params: [
                    new exps.LambdaParam({ name: 'p1' }),
                    new exps.LambdaParam({ name: 'p2' }),
                ],
                body: getDummyReducedNode(int),
                type: new TFunction([int, new TChar()], new TBool()),
                locations: { self: loc },
            });
            const tc = getDummyTypeChecker();
            lambda.completeResolution(tc, { path: '/index.ren' });
            expect(tc.errors.map(e => e.message)).to.eql(['Type "signed 32-bit integer" is not assignable to type "bool" [/index.ren:1:1]']);
        });
    });

    describe('UnaryExpression', () => {
        it('should reduce prefix expression', () => {
            const prefix = new exps.UnaryExpression({
                prefix: true,
                operatorToken: new Token('OPER', 1, 1, '+'),
                target: getDummyNode({ locations: { self: { ...loc, startColumn: 2, endColumn: 2 } } }),
            });
            expect(prefix.reduce()).to.eql(new exps.UnaryExpression({
                prefix: true,
                oper: '+',
                target: { locations: { self: { ...loc, startColumn: 2, endColumn: 2 } } },
                locations: {
                    self: { ...loc, endColumn: 2 },
                    oper: loc,
                },
            }));
        });

        it('should reduce postfix expression', () => {
            const postfix = new exps.UnaryExpression({
                prefix: false,
                target: getDummyNode({ locations: { self: loc } }),
                operatorToken: new Token('OPER', 1, 2, '+'),
            });
            expect(postfix.reduce()).to.eql(new exps.UnaryExpression({
                prefix: false,
                target: { locations: { self: loc } },
                oper: '+',
                locations: {
                    self: { ...loc, endColumn: 2 },
                    oper: { ...loc, startColumn: 2, endColumn: 2 },
                },
            }));
        });

        it('should resolve type of prefix expression', () => {
            const prefix = new exps.UnaryExpression({
                prefix: true,
                target: getDummyReducedNode(new TBool()),
                oper: '!',
            });
            expect(prefix.resolveType({}, {}, {})).to.eql(new TBool());
        });

        it('should resolve type of postfix expression', () => {
            const postfix = new exps.UnaryExpression({
                prefix: false,
                target: getDummyReducedNode(int),
                oper: '++',
            });
            expect(postfix.resolveType({}, {}, {})).to.eql(int);
        });

        it('should error for non-existent operator', () => {
            const op = new exps.UnaryExpression({
                prefix: false,
                target: getDummyReducedNode(int),
                oper: '!$%',
                locations: { oper: loc },
            });
            const tc = getDummyTypeChecker();
            expect(op.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Value "!$%" is not defined [/index.ren:1:1]']);
        });

        it('should error for invalid target expression', () => {
            const op = new exps.UnaryExpression({
                prefix: true,
                target: getDummyReducedNode(new TBool()),
                oper: '-',
                locations: { self: loc },
            });
            const tc = getDummyTypeChecker();
            expect(op.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Operator "-" does not operate on type "bool" [/index.ren:1:1]']);
        });
    });

    describe('BinaryExpression', () => {
        it('should reduce binary expression', () => {
            const left = new exps.IntegerLiteral(1, loc);
            const right = new exps.IntegerLiteral(2, { ...loc, startColumn: 3, endColumn: 3 });
            const binary = new exps.BinaryExpression({ left, operatorToken: new Token('OPER', 1, 2, '+'), right });
            expect(binary.reduce()).to.eql(new exps.BinaryExpression({
                left,
                oper: '+',
                right,
                locations: {
                    self: { ...loc, endColumn: 3 },
                    oper: { ...loc, startColumn: 2, endColumn: 2 },
                },
            }));
        });

        it('should resolve type of simple binary expression', () => {
            const binary = new exps.BinaryExpression({
                left: getDummyReducedNode(int),
                oper: '+',
                right: getDummyReducedNode(int),
            });
            expect(binary.resolveType({}, {}, {})).to.eql(int);
        });

        it('should error for non-existent operator', () => {
            const binary = new exps.BinaryExpression({
                left: getDummyReducedNode(int),
                oper: '!!',
                right: getDummyReducedNode(int),
                locations: { oper: loc },
            });
            const tc = getDummyTypeChecker();
            expect(binary.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Value "!!" is not defined [/index.ren:1:1]']);
        });

        it('should error for invalid target expressions', () => {
            const binary = new exps.BinaryExpression({
                left: getDummyReducedNode(new TBool()),
                oper: '+',
                right: getDummyReducedNode(new TBool()),
                locations: { self: loc },
            });
            const tc = getDummyTypeChecker();
            expect(binary.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Operator "+" does not operate on types "bool" and "bool" [/index.ren:1:1]']);
        });

        describe('operator precedence resolution', () => {
            @operator('$<', 'infix')
            class LeftAssocOperator extends Operator { // eslint-disable-line no-unused-vars
                constructor() {
                    super('$<', 'infix', 9, 'left');
                }
            }

            @operator('$>', 'infix')
            class RightAssocOperator extends Operator { // eslint-disable-line no-unused-vars
                constructor() {
                    super('$>', 'infix', 9, 'right');
                }
            }

            function assembleBinary({ left, oper, right }, nest = true) {
                if (nest) {
                    return new exps.Expression({
                        binary: new exps.BinaryExpression({
                            left,
                            operatorToken: new Token('OPER', 1, 1, oper),
                            right,
                        }),
                    });
                } else {
                    return new exps.BinaryExpression({
                        left,
                        oper,
                        right,
                        locations: { self: loc, oper: { ...loc, endColumn: oper.length } },
                    });
                }
            }

            it('should resolve when precedence order is correct', () => {
                const exp = assembleBinary({
                    left: assembleBinary({
                        left: new exps.IntegerLiteral(1, loc),
                        oper: '*',
                        right: new exps.IntegerLiteral(2, loc),
                    }),
                    oper: '+',
                    right: new exps.IntegerLiteral(3, loc),
                });
                expect(exp.reduce()).to.eql(assembleBinary({
                    left: assembleBinary({
                        left: new exps.IntegerLiteral(1, loc),
                        oper: '*',
                        right: new exps.IntegerLiteral(2, loc),
                    }, false),
                    oper: '+',
                    right: new exps.IntegerLiteral(3, loc),
                }, false));
            });

            it('should resolve when precedence order is incorrect', () => {
                const exp = assembleBinary({
                    left: assembleBinary({
                        left: new exps.IntegerLiteral(1, loc),
                        oper: '+',
                        right: new exps.IntegerLiteral(2, loc),
                    }),
                    oper: '*',
                    right: new exps.IntegerLiteral(3, loc),
                });
                expect(exp.reduce()).to.eql(assembleBinary({
                    left: new exps.IntegerLiteral(1, loc),
                    oper: '+',
                    right: assembleBinary({
                        left: new exps.IntegerLiteral(2, loc),
                        oper: '*',
                        right: new exps.IntegerLiteral(3, loc),
                    }, false),
                }, false));
            });

            it('should resolve when associativity order is correct', () => {
                const exp = assembleBinary({
                    left: assembleBinary({
                        left: new exps.IntegerLiteral(1, loc),
                        oper: '-',
                        right: new exps.IntegerLiteral(2, loc),
                    }),
                    oper: '+',
                    right: new exps.IntegerLiteral(3, loc),
                });
                expect(exp.reduce()).to.eql(assembleBinary({
                    left: assembleBinary({
                        left: new exps.IntegerLiteral(1, loc),
                        oper: '-',
                        right: new exps.IntegerLiteral(2, loc),
                    }, false),
                    oper: '+',
                    right: new exps.IntegerLiteral(3, loc),
                }, false));
            });

            it('should resolve when associativity order is incorrect', () => {
                const exp = assembleBinary({
                    left: assembleBinary({
                        left: new exps.IntegerLiteral(1, loc),
                        oper: '$>',
                        right: new exps.IntegerLiteral(2, loc),
                    }),
                    oper: '$>',
                    right: new exps.IntegerLiteral(3, loc),
                });
                expect(exp.reduce()).to.eql(assembleBinary({
                    left: new exps.IntegerLiteral(1, loc),
                    oper: '$>',
                    right: assembleBinary({
                        left: new exps.IntegerLiteral(2, loc),
                        oper: '$>',
                        right: new exps.IntegerLiteral(3, loc),
                    }, false),
                }, false));
            });

            it('should handle deeply nested binary expressions', () => {
                const exp = assembleBinary({
                    left: assembleBinary({
                        left: assembleBinary({
                            left: assembleBinary({
                                left: assembleBinary({
                                    left: assembleBinary({
                                        left: assembleBinary({
                                            left: new exps.IntegerLiteral(1, loc),
                                            oper: '+',
                                            right: new exps.IntegerLiteral(2, loc),
                                        }),
                                        oper: '*',
                                        right: new exps.IntegerLiteral(3, loc),
                                    }),
                                    oper: '&',
                                    right: new exps.IntegerLiteral(4, loc),
                                }),
                                oper: '==',
                                right: new exps.IntegerLiteral(5, loc),
                            }),
                            oper: '/',
                            right: new exps.IntegerLiteral(6, loc),
                        }),
                        oper: '|',
                        right: new exps.IntegerLiteral(7, loc),
                    }),
                    oper: '-',
                    right: new exps.IntegerLiteral(8, loc),
                });
                expect(exp.reduce()).to.eql(assembleBinary({
                    left: assembleBinary({
                        left: new exps.IntegerLiteral(1, loc),
                        oper: '+',
                        right: assembleBinary({
                            left: new exps.IntegerLiteral(2, loc),
                            oper: '*',
                            right: assembleBinary({
                                left: new exps.IntegerLiteral(3, loc),
                                oper: '&',
                                right: new exps.IntegerLiteral(4, loc),
                            }, false),
                        }, false),
                    }, false),
                    oper: '==',
                    right: assembleBinary({
                        left: assembleBinary({
                            left: new exps.IntegerLiteral(5, loc),
                            oper: '/',
                            right: assembleBinary({
                                left: new exps.IntegerLiteral(6, loc),
                                oper: '|',
                                right: new exps.IntegerLiteral(7, loc),
                            }, false),
                        }, false),
                        oper: '-',
                        right: new exps.IntegerLiteral(8, loc),
                    }, false),
                }, false));
            });
        });
    });

    describe('IfElseExpression', () => {
        it('should reduce if-else expression', () => {
            const ifElse = new exps.IfElseExpression({
                ifToken: new Token('IF', 1, 1, 'if'),
                condition: getDummyNode(),
                consequent: getDummyNode(),
                alternate: getDummyNode({ locations: { self: { ...loc, startColumn: 3, endColumn: 3 } } }),
            });
            expect(ifElse.reduce()).to.eql(new exps.IfElseExpression({
                condition: {},
                consequent: {},
                alternate: { locations: { self: { ...loc, startColumn: 3, endColumn: 3 } } },
                locations: { self: { ...loc, endColumn: 3 } },
            }));
        });

        it('should resolve type of if-else expression', () => {
            const ifElse = new exps.IfElseExpression({
                condition: getDummyReducedNode(new TBool()),
                consequent: getDummyReducedNode(int),
                alternate: getDummyReducedNode(int),
            });
            expect(ifElse.resolveType({}, {}, {})).to.eql(int);
        });

        it('should error when condition is not bool', () => {
            const ifElse = new exps.IfElseExpression({
                condition: getDummyReducedNode(new TChar(), { locations: { self: loc } }),
                consequent: getDummyReducedNode(int),
                alternate: getDummyReducedNode(int),
            });
            const tc = getDummyTypeChecker();
            expect(ifElse.resolveType(tc, { path: '/index.ren' }, {})).to.eql(int);
            expect(tc.errors.map(e => e.message)).to.eql(['Type "char" is not assignable to type "bool" [/index.ren:1:1]']);
        });
    });

    describe('VarDeclaration', () => {
        it('should reduce var declaration', () => {
            const varDecl = new exps.VarDeclaration({
                varIdentToken: new Token('IDENT', 1, 1, 'myVar'),
                initialValue: getDummyNode({ locations: { self: { ...loc, startColumn: 6, endColumn: 6 } } }),
            });
            expect(varDecl.reduce()).to.eql(new exps.VarDeclaration({
                name: 'myVar',
                initExp: { locations: { self: { ...loc, startColumn: 6, endColumn: 6 } } },
                locations: {
                    name: { ...loc, endColumn: 5 },
                    self: { ...loc, endColumn: 6 },
                },
            }));
        });

        it('should resolve type of var declaration', () => {
            const varDecl = new exps.VarDeclaration({
                name: 'myVar',
                initExp: getDummyReducedNode(int),
            });
            const tc = getDummyTypeChecker();
            const symbolTable = {};
            expect(varDecl.resolveType(tc, {}, symbolTable)).to.eql(int);
        });

        it('should error when var already exists', () => {
            const varDecl = new exps.VarDeclaration({
                name: 'myVar',
                initExp: getDummyReducedNode(int),
                locations: { name: loc },
            });
            // clash with symbol table
            let tc = getDummyTypeChecker();
            const symbolTable = { myVar: new TBool() };
            expect(varDecl.resolveType(tc, { path: '/index.ren' }, symbolTable)).to.eql(int);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myVar" is already declared [/index.ren:1:1]']);
            // clash with module-scoped symbol
            tc = getDummyTypeChecker(new TBool());
            expect(varDecl.resolveType(tc, { path: '/index.ren' }, {})).to.eql(int);
            expect(tc.errors.map(e => e.message)).to.eql(['A value with name "myVar" is already declared [/index.ren:1:1]']);
        });
    });

    describe('FunctionApplication', () => {
        it('should reduce function application', () => {
            const app = new exps.FunctionApplication({
                target: getDummyNode({ locations: { self: loc } }),
                paramValues: [getDummyNode()],
                closeParenToken: new Token('RPAREN', 1, 2, ')'),
            });
            expect(app.reduce()).to.eql(new exps.FunctionApplication({
                target: { locations: { self: loc } },
                paramValues: [{}],
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should resolve type of function application', () => {
            const app = new exps.FunctionApplication({
                target: getDummyReducedNode(new TFunction([int], new TBool())),
                paramValues: [getDummyReducedNode(int)],
            });
            expect(app.resolveType({}, {}, {})).to.eql(new TBool());
        });

        it('should return unknown for unknown target type', () => {
            const app = new exps.FunctionApplication({
                target: getDummyReducedNode(new TUnknown()),
                paramValues: [getDummyReducedNode(int)],
            });
            expect(app.resolveType({}, {}, {})).to.eql(new TUnknown());
        });

        it('should error for non-function target type', () => {
            const app = new exps.FunctionApplication({
                target: getDummyReducedNode(int, { locations: { self: loc } }),
                paramValues: [getDummyReducedNode(int)],
            });
            const tc = getDummyTypeChecker();
            expect(app.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Cannot invoke a value that is not a function [/index.ren:1:1]']);
        });

        it('should skip unknown argument values', () => {
            const app = new exps.FunctionApplication({
                target: getDummyReducedNode(new TFunction([int], new TBool())),
                paramValues: [getDummyReducedNode(new TUnknown())],
            });
            expect(app.resolveType({}, {}, {})).to.eql(new TBool());
        });

        it('should error for non-assignable argument values', () => {
            const app = new exps.FunctionApplication({
                target: getDummyReducedNode(new TFunction([int], new TBool())),
                paramValues: [getDummyReducedNode(new TChar(), { locations: { self: loc } })],
            });
            const tc = getDummyTypeChecker();
            expect(app.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Type "char" is not assignable to type "signed 32-bit integer" [/index.ren:1:1]']);
        });

        it('should handle lambda expression arguments', () => {
            // in this test, we take a lambda with no explicit types and pass it as an argument value
            // the type should complete resolution, and then the lambda node should complete resolution
            const paramType = new TFunction([int], new TBool());
            const lambda = new exps.LambdaExpression({ params: [new exps.LambdaParam({ name: 'p' })], body: getDummyReducedNode(new TBool()) });
            const functionType = new TFunction([paramType], new TBool());
            const app = new exps.FunctionApplication({
                target: getDummyReducedNode(functionType),
                paramValues: [lambda],
            });
            const tc = getDummyTypeChecker();
            expect(app.resolveType(tc, {}, {})).to.eql(new TBool());
            expect(tc.errors).to.eql([]);
            expect(lambda.type).to.eql(paramType);
        });
    });

    describe('FieldAccess', () => {
        it('should reduce field access', () => {
            const acc = new exps.FieldAccess({
                target: getDummyNode({ locations: { self: loc } }),
                fieldIdentToken: new Token('IDENT', 1, 2, 'myField'),
            });
            expect(acc.reduce()).to.eql(new exps.FieldAccess({
                target: { locations: { self: loc } },
                field: 'myField',
                locations: {
                    self: { ...loc, endColumn: 8 },
                    field: { ...loc, startColumn: 2, endColumn: 8 },
                },
            }));
        });

        it('should resolve type of field access', () => {
            const acc = new exps.FieldAccess({
                target: getDummyReducedNode(new TStruct({ field: int })),
                field: 'field',
            });
            expect(acc.resolveType({}, {}, {})).to.eql(int);
        });

        it('should return unknown for unknown target type', () => {
            const acc = new exps.FieldAccess({
                target: getDummyReducedNode(new TUnknown()),
                field: 'field',
            });
            expect(acc.resolveType({}, {}, {})).to.eql(new TUnknown());
        });

        it('should error for non-struct target type', () => {
            const acc = new exps.FieldAccess({
                target: getDummyReducedNode(int, { locations: { self: loc } }),
                field: 'field',
            });
            const tc = getDummyTypeChecker();
            expect(acc.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Cannot access field of a value that is not a struct [/index.ren:1:1]']);
        });

        it('should error for undefined field name', () => {
            const acc = new exps.FieldAccess({
                target: getDummyReducedNode(new TStruct({ field: int })),
                field: 'feild',
                locations: { field: loc },
            });
            const tc = getDummyTypeChecker();
            expect(acc.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Value "feild" is not defined [/index.ren:1:1]']);
        });
    });

    describe('ArrayAccess', () => {
        it('should reduce array access', () => {
            const acc = new exps.ArrayAccess({
                target: getDummyNode({ locations: { self: loc } }),
                indexExp: getDummyNode(),
                closeBracketToken: new Token('RBRACK', 1, 2, ']'),
            });
            expect(acc.reduce()).to.eql(new exps.ArrayAccess({
                target: { locations: { self: loc } },
                indexExp: {},
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should resolve type of array access', () => {
            const acc = new exps.ArrayAccess({
                target: getDummyReducedNode(new TArray(new TChar())),
                indexExp: getDummyReducedNode(int),
            });
            expect(acc.resolveType({}, {}, {})).to.eql(new TChar());
        });

        it('should return unknown for unknown target type', () => {
            const acc = new exps.ArrayAccess({
                target: getDummyReducedNode(new TUnknown()),
                indexExp: getDummyReducedNode(int),
            });
            expect(acc.resolveType({}, {}, {})).to.eql(new TUnknown());
        });

        it('should error for non-array target type', () => {
            const acc = new exps.ArrayAccess({
                target: getDummyReducedNode(int, { locations: { self: loc } }),
                indexExp: getDummyReducedNode(int),
            });
            const tc = getDummyTypeChecker();
            expect(acc.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Cannot access index of a value that is not an array [/index.ren:1:1]']);
        });

        it('should ignore unknown index type', () => {
            const acc = new exps.ArrayAccess({
                target: getDummyReducedNode(new TArray(new TChar())),
                indexExp: getDummyReducedNode(new TUnknown()),
            });
            expect(acc.resolveType({}, {}, {})).to.eql(new TChar());
        });

        it('should error for non-integer index type', () => {
            const acc = new exps.ArrayAccess({
                target: getDummyReducedNode(new TArray(new TChar())),
                indexExp: getDummyReducedNode(new TChar(), { locations: { self: loc } }),
            });
            const tc = getDummyTypeChecker();
            expect(acc.resolveType(tc, { path: '/index.ren' }, {})).to.eql(new TUnknown());
            expect(tc.errors.map(e => e.message)).to.eql(['Type "char" is not assignable to type "integer" [/index.ren:1:1]']);
        });
    });
});
