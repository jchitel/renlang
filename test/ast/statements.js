import { expect } from 'chai';

import * as stmts from '../../src/ast/statements';
import { Token } from '../../src/parser/Tokenizer';
import { TInteger, TFloat, TChar, TBool, TTuple, TStruct, TArray, TFunction, TUnion, TAny, TUnknown } from '../../src/typecheck/types';
import { Expression } from '../../src/ast/expressions';


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

describe('Statement Nodes', () => {
    describe('Statement', () => {
        it('should reduce to a block', () => {
            const stmt = new stmts.Statement({ block: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should reduce to an expression statement', () => {
            const stmt = new stmts.Statement({ exp: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should reduce to a for statement', () => {
            const stmt = new stmts.Statement({ for: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should reduce to a while statement', () => {
            const stmt = new stmts.Statement({ while: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should reduce to a do-while statement', () => {
            const stmt = new stmts.Statement({ doWhile: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should reduce to a try-catch statement', () => {
            const stmt = new stmts.Statement({ tryCatch: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should reduce to a throw statement', () => {
            const stmt = new stmts.Statement({ throw: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should reduce to a return statement', () => {
            const stmt = new stmts.Statement({ return: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should reduce to a break statement', () => {
            const stmt = new stmts.Statement({ break: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should reduce to a continue statement', () => {
            const stmt = new stmts.Statement({ continue: getDummyNode() });
            expect(stmt.reduce()).to.eql({});
        });

        it('should throw an error for an invalid node', () => {
            expect(() => new stmts.Statement({}).reduce()).to.throw('Invalid Statement node');
        });
    });

    describe('Block', () => {
        it('should reduce a block', () => {
            const block = new stmts.Block({
                openBraceToken: new Token('LBRACE', 1, 1, '{'),
                statements: [getDummyNode(), getDummyNode()],
                closeBraceToken: new Token('RBRACE', 1, 2, '}'),
            });
            expect(block.reduce()).to.eql(new stmts.Block({
                statements: [{}, {}],
                locations: { self: { ...loc, endColumn: 2 } },
            }));
        });

        it('should filter no-ops', () => {
            const noop = new stmts.Noop({ ...loc, startColumn: 2, endColumn: 2 }, { ...loc, startColumn: 3, endColumn: 3 });
            const block = new stmts.Block({
                openBraceToken: new Token('LBRACE', 1, 1, '{'),
                statements: [getDummyNode(), getDummyNode(noop)],
                closeBraceToken: new Token('RBRACE', 1, 4, '}'),
            });
            expect(block.reduce()).to.eql(new stmts.Block({
                statements: [{}],
                locations: { self: { ...loc, endColumn: 4 } },
            }));
        });

        it('should reduce to a no-op', () => {
            const noop = new stmts.Noop({ ...loc, startColumn: 2, endColumn: 2 }, { ...loc, startColumn: 3, endColumn: 3 });
            const block = new stmts.Block({
                openBraceToken: new Token('LBRACE', 1, 1, '{'),
                statements: [getDummyNode(noop)],
                closeBraceToken: new Token('RBRACE', 1, 4, '}'),
            });
            expect(block.reduce()).to.eql(new stmts.Noop(loc, { ...loc, startColumn: 4, endColumn: 4 }));
        });

        it('should resolve type of non-return block', () => {
            const block = new stmts.Block({ statements: [getDummyReducedNode(null)] });
            expect(block.resolveType({}, {}, {})).to.eql(null);
        });

        it('should resolve type of return block', () => {
            const block = new stmts.Block({ statements: [getDummyReducedNode(int)] });
            expect(block.resolveType({}, {}, {})).to.eql(int);
        });

        it('should ignore types of expression statements', () => {
            const exp = new Expression({ parenthesized: getDummyReducedNode(int) });
            const block = new stmts.Block({ statements: [exp, getDummyReducedNode(null)] });
            expect(block.resolveType({}, {}, {})).to.eql(null);
        });
    });

    describe('Noop', () => {
        it('should resolve to falsy type', () => {
            const noop = new stmts.Noop(loc, loc);
            expect(noop.resolveType({}, {}, {})).to.eql(undefined);
        });
    });

    describe('ForStatement', () => {
        it('should reduce a for statement', () => {
            const f = new stmts.ForStatement({
                forToken: new Token('FOR', 1, 1, 'for'),
                iterVar: new Token('IDENT', 1, 2, 'myIter'),
                iterableExp: getDummyNode(),
                body: getDummyNode({ locations: { self: { ...loc, startColumn: 8, endColumn: 8 } } }),
            });
            expect(f.reduce()).to.eql(new stmts.ForStatement({
                iterVar: 'myIter',
                iterableExp: {},
                body: { locations: { self: { ...loc, startColumn: 8, endColumn: 8 } } },
                locations: {
                    self: { ...loc, endColumn: 8 },
                    iterVar: { ...loc, startColumn: 2, endColumn: 7 },
                },
            }));
        });

        it('should resolve type of for statement');

        it('should error and resolve iterator type as unknown for non-iterable expression');

        it('should increment the loop number if already set');
    });

    describe('WhileStatement', () => {
        it('should reduce a while statement');

        it('should resolve type of while statement');

        it('should error for non-bool condition');

        it('should increment loop number if already set');
    });

    describe('DoWhileStatement', () => {
        it('should reduce a do-while statement');

        it('should resolve type of do-while statement');

        it('should error for non-bool condition');

        it('should increment loop number if already set');
    });

    describe('TryCatchStatement', () => {
        it('should reduce a try-catch statement');

        it('should set location correctly when a finally is used');

        it('should resolve type of try-catch statement');
    });

    describe('ThrowStatement', () => {
        it('should reduce a throw statement');

        it('should resolve type of throw statement');
    });

    describe('ReturnStatement', () => {
        it('should reduce a void return statement');

        it('should reduce a non-void return statement');

        it('should resolve type of void return statement');

        it('should resolve type of non-void return statement');
    });

    describe('BreakStatement', () => {
        it('should reduce default break statement');

        it('should reduce break statement with loop number');

        it('should resolve to nothing');

        it('should error for being outside loop');

        it('should error for negative loop number');

        it('should error for too large loop number');
    });

    describe('ContinueStatement', () => {
        it('should reduce default continue statement');

        it('should reduce continue statement with loop number');

        it('should resolve to nothing');

        it('should error for being outside loop');

        it('should error for negative loop number');

        it('should error for too large loop number');
    });
});
