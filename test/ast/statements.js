import { expect } from 'chai';

import * as stmts from '../../src/ast/statements';
import { Token } from '../../src/parser/Tokenizer';
import { TInteger, TChar, TBool, TTuple, TStruct, TArray, TUnknown } from '../../src/typecheck/types';
import { Expression } from '../../src/ast/expressions';


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
                iterVar: new Token('IDENT', 1, 4, 'myIter'),
                iterableExp: getDummyNode(),
                body: getDummyNode({ locations: { self: { ...loc, startColumn: 10, endColumn: 10 } } }),
            });
            expect(f.reduce()).to.eql(new stmts.ForStatement({
                iterVar: 'myIter',
                iterableExp: {},
                body: { locations: { self: { ...loc, startColumn: 10, endColumn: 10 } } },
                locations: {
                    self: { ...loc, endColumn: 10 },
                    iterVar: { ...loc, startColumn: 4, endColumn: 9 },
                },
            }));
        });

        it('should resolve type of for statement', () => {
            // this symbol table will be filled with whatever is passed as the symbol table to body.resolveType()
            const bodySymbolTable = {};
            const f = new stmts.ForStatement({
                iterVar: 'myIter',
                iterableExp: getDummyReducedNode(new TArray(int)),
                body: getDummyReducedNode(int, {}, bodySymbolTable),
            });
            // this symbol table will contain the resulting symbols after the resolution
            const symbolTable = {};
            // verify the body return type
            expect(f.resolveType({}, {}, symbolTable)).to.eql(int);
            // verify the symbol table passed to the body
            expect(bodySymbolTable).to.eql({ myIter: int, '@@loopNumber': 0 });
            // verify the resulting symbol table
            expect(symbolTable).to.eql({ '@@loopNumber': -1 });
        });

        it('should error and resolve iterator type as unknown for non-iterable expression', () => {
            const bodySymbolTable = {};
            const f = new stmts.ForStatement({
                iterVar: 'myIter',
                iterableExp: getDummyReducedNode(int, { locations: { self: loc } }), // non-iterable
                body: getDummyReducedNode(int, {}, bodySymbolTable),
            });
            const typeChecker = { errors: [] };
            const module = { path: '/index.ren' };
            expect(f.resolveType(typeChecker, module, {})).to.eql(int);
            expect(bodySymbolTable.myIter).to.eql(new TUnknown());
            expect(typeChecker.errors.map(e => e.message)).to.eql(['Type "signed 32-bit integer" is not assignable to type "?[]" [/index.ren:1:1]']);
        });

        it('should increment the loop number if already set', () => {
            // this symbol table will be filled with whatever is passed as the symbol table to body.resolveType()
            const bodySymbolTable = {};
            const f = new stmts.ForStatement({
                iterVar: 'myIter',
                iterableExp: getDummyReducedNode(new TArray(int)),
                body: getDummyReducedNode(null, {}, bodySymbolTable),
            });
            // this symbol table will contain the resulting symbols after the resolution
            const symbolTable = { '@@loopNumber': 1 };
            expect(f.resolveType({}, {}, symbolTable)).to.eql(null);
            // verify the symbol table passed to the body
            expect(bodySymbolTable).to.eql({ myIter: int, '@@loopNumber': 2 });
            // verify the resulting symbol table
            expect(symbolTable).to.eql({ '@@loopNumber': 1 });
        });
    });

    describe('WhileStatement', () => {
        it('should reduce a while statement', () => {
            const w = new stmts.WhileStatement({
                whileToken: new Token('WHILE', 1, 1, 'while'),
                conditionExp: getDummyNode(),
                body: getDummyNode({ locations: { self: { ...loc, startColumn: 6, endColumn: 6 } } }),
            });
            expect(w.reduce()).to.eql(new stmts.WhileStatement({
                conditionExp: {},
                body: { locations: { self: { ...loc, startColumn: 6, endColumn: 6 } } },
                locations: { self: { ...loc, endColumn: 6 } },
            }));
        });

        it('should resolve type of while statement', () => {
            // this symbol table will be filles with whatever is passed as the symbol table to body.resolveType()
            const bodySymbolTable = {};
            const w = new stmts.WhileStatement({
                conditionExp: getDummyReducedNode(new TBool()),
                body: getDummyReducedNode(int, {}, bodySymbolTable),
            });
            // this symbol table will contain the resulting symbols after the resolution
            const symbolTable = {};
            // verify the body return type
            expect(w.resolveType({}, {}, symbolTable)).to.eql(int);
            // verify the symbol table passed to the body
            expect(bodySymbolTable).to.eql({ '@@loopNumber': 0 });
            // verify the resulting symbol table
            expect(symbolTable).to.eql({ '@@loopNumber': -1 });
        });

        it('should error for non-bool condition', () => {
            const w = new stmts.WhileStatement({
                conditionExp: getDummyReducedNode(int, { locations: { self: loc } }),
                body: getDummyReducedNode(int),
            });
            const typeChecker = { errors: [] };
            expect(w.resolveType(typeChecker, { path: '/index.ren' }, {})).to.eql(int);
            expect(typeChecker.errors.map(e => e.message)).to.eql(['Type "signed 32-bit integer" is not assignable to type "bool" [/index.ren:1:1]']);
        });

        it('should increment loop number if already set', () => {
            // this symbol table will be filled with whatever is passed as the symbol table to body.resolveType()
            const bodySymbolTable = {};
            const w = new stmts.WhileStatement({
                conditionExp: getDummyReducedNode(new TBool()),
                body: getDummyReducedNode(null, {}, bodySymbolTable),
            });
            // this symbol table will contain the resulting symbols after the resolution
            const symbolTable = { '@@loopNumber': 1 };
            expect(w.resolveType({}, {}, symbolTable)).to.eql(null);
            // verify the symbol table passed to the body
            expect(bodySymbolTable).to.eql({ '@@loopNumber': 2 });
            // verify the resulting symbol table
            expect(symbolTable).to.eql({ '@@loopNumber': 1 });
        });
    });

    describe('DoWhileStatement', () => {
        it('should reduce a do-while statement', () => {
            const d = new stmts.DoWhileStatement({
                doToken: new Token('DO', 1, 1, 'do'),
                body: getDummyNode({ locations: { self: { ...loc, startColumn: 3, endColumn: 3 } } }),
                conditionExp: getDummyNode(),
                closeParenToken: new Token('RPAREN', 1, 4, ')'),
            });
            expect(d.reduce()).to.eql(new stmts.DoWhileStatement({
                body: { locations: { self: { ...loc, startColumn: 3, endColumn: 3 } } },
                conditionExp: {},
                locations: { self: { ...loc, endColumn: 4 } },
            }));
        });

        it('should resolve type of do-while statement', () => {
            // this symbol table will be filles with whatever is passed as the symbol table to body.resolveType()
            const bodySymbolTable = {};
            const d = new stmts.DoWhileStatement({
                body: getDummyReducedNode(int, {}, bodySymbolTable),
                conditionExp: getDummyReducedNode(new TBool()),
            });
            // this symbol table will contain the resulting symbols after the resolution
            const symbolTable = {};
            // verify the body return type
            expect(d.resolveType({}, {}, symbolTable)).to.eql(int);
            // verify the symbol table passed to the body
            expect(bodySymbolTable).to.eql({ '@@loopNumber': 0 });
            // verify the resulting symbol table
            expect(symbolTable).to.eql({ '@@loopNumber': -1 });
        });

        it('should error for non-bool condition', () => {
            const d = new stmts.DoWhileStatement({
                body: getDummyReducedNode(int),
                conditionExp: getDummyReducedNode(int, { locations: { self: loc } }),
            });
            const typeChecker = { errors: [] };
            expect(d.resolveType(typeChecker, { path: '/index.ren' }, {})).to.eql(int);
            expect(typeChecker.errors.map(e => e.message)).to.eql(['Type "signed 32-bit integer" is not assignable to type "bool" [/index.ren:1:1]']);
        });

        it('should increment loop number if already set', () => {
            // this symbol table will be filled with whatever is passed as the symbol table to body.resolveType()
            const bodySymbolTable = {};
            const d = new stmts.DoWhileStatement({
                body: getDummyReducedNode(null, {}, bodySymbolTable),
                conditionExp: getDummyReducedNode(new TBool()),
            });
            // this symbol table will contain the resulting symbols after the resolution
            const symbolTable = { '@@loopNumber': 1 };
            expect(d.resolveType({}, {}, symbolTable)).to.eql(null);
            // verify the symbol table passed to the body
            expect(bodySymbolTable).to.eql({ '@@loopNumber': 2 });
            // verify the resulting symbol table
            expect(symbolTable).to.eql({ '@@loopNumber': 1 });
        });
    });

    describe('TryCatchStatement', () => {
        it('should reduce a try-catch statement', () => {
            const t = new stmts.TryCatchStatement({
                tryToken: new Token('TRY', 1, 1, 'try'),
                tryBody: getDummyNode(),
                catchParams: [getDummyNode()],
                catchBlocks: [getDummyNode({ locations: { self: { ...loc, startColumn: 4, endColumn: 4 } } })],
            });
            expect(t.reduce()).to.eql(new stmts.TryCatchStatement({
                try: {},
                catches: [{ param: {}, body: { locations: { self: { ...loc, startColumn: 4, endColumn: 4 } } } }],
                locations: { self: { ...loc, endColumn: 4 } },
            }));
        });

        it('should set location correctly when a finally is used', () => {
            const t = new stmts.TryCatchStatement({
                tryToken: new Token('TRY', 1, 1, 'try'),
                tryBody: getDummyNode(),
                catchParams: [getDummyNode()],
                catchBlocks: [getDummyNode()],
                finallyBlock: getDummyNode({ locations: { self: { ...loc, startColumn: 4, endColumn: 4 } } }),
            });
            expect(t.reduce()).to.eql(new stmts.TryCatchStatement({
                try: {},
                catches: [{ param: {}, body: {} }],
                finally: { locations: { self: { ...loc, startColumn: 4, endColumn: 4 } } },
                locations: { self: { ...loc, endColumn: 4 } },
            }));
        });

        it('should resolve type of try-catch statement', () => {
            const catchSymbolTable = {};
            const errType = new TStruct({ message: new TArray(new TChar()) });
            const t = new stmts.TryCatchStatement({
                try: getDummyReducedNode(int),
                catches: [{ param: { name: 'err', type: getDummyReducedNode(errType) }, body: getDummyReducedNode(int, {}, catchSymbolTable) }],
            });
            const symbolTable = {};
            expect(t.resolveType({}, {}, symbolTable)).to.eql(int);
            expect(catchSymbolTable).to.eql({ err: errType });
            expect(symbolTable).to.eql({});
        });

        it('should resolve type of try-catch-finally statement', () => {
            const errType = new TStruct({ message: new TArray(new TChar()) });
            const t = new stmts.TryCatchStatement({
                try: getDummyReducedNode(int),
                catches: [{ param: { name: 'err', type: getDummyReducedNode(errType) }, body: getDummyReducedNode(int) }],
                finally: getDummyReducedNode(int),
            });
            expect(t.resolveType({}, {}, {})).to.eql(int);
        });
    });

    describe('ThrowStatement', () => {
        it('should reduce a throw statement', () => {
            const t = new stmts.ThrowStatement({
                throwToken: new Token('THROW', 1, 1, 'throw'),
                exp: getDummyNode({ locations: { self: { ...loc, startColumn: 6, endColumn: 6 } } }),
            });
            expect(t.reduce()).to.eql(new stmts.ThrowStatement({
                exp: { locations: { self: { ...loc, startColumn: 6, endColumn: 6 } } },
                locations: { self: { ...loc, endColumn: 6 } },
            }));
        });

        it('should resolve type of throw statement', () => {
            expect(new stmts.ThrowStatement({ exp: getDummyReducedNode(int) }).resolveType({}, {}, {})).to.eql(undefined);
        });
    });

    describe('ReturnStatement', () => {
        it('should reduce a void return statement', () => {
            const r = new stmts.ReturnStatement({
                returnToken: new Token('RETURN', 1, 1, 'return'),
            });
            expect(r.reduce()).to.eql(new stmts.ReturnStatement({
                locations: { self: { ...loc, endColumn: 6 } },
            }));
        });

        it('should reduce a non-void return statement', () => {
            const r = new stmts.ReturnStatement({
                returnToken: new Token('RETURN', 1, 1, 'return'),
                exp: getDummyNode({ locations: { self: { ...loc, startColumn: 7, endColumn: 7 } } }),
            });
            expect(r.reduce()).to.eql(new stmts.ReturnStatement({
                exp: { locations: { self: { ...loc, startColumn: 7, endColumn: 7 } } },
                locations: { self: { ...loc, endColumn: 7 } },
            }));
        });

        it('should resolve type of void return statement', () => {
            const r = new stmts.ReturnStatement({});
            expect(r.resolveType({}, {}, {})).to.eql(new TTuple([]));
        });

        it('should resolve type of non-void return statement', () => {
            const r = new stmts.ReturnStatement({ exp: getDummyReducedNode(int) });
            expect(r.resolveType({}, {}, {})).to.eql(int);
        });
    });

    describe('BreakStatement', () => {
        it('should reduce default break statement', () => {
            const b = new stmts.BreakStatement({ breakToken: new Token('BREAK', 1, 1, 'break') });
            expect(b.reduce()).to.eql(new stmts.BreakStatement({ loopNumber: 0, locations: { self: { ...loc, endColumn: 5 } } }));
        });

        it('should reduce break statement with loop number', () => {
            const b = new stmts.BreakStatement({
                breakToken: new Token('BREAK', 1, 1, 'break'),
                loopNumber: new Token('INTEGER_LITERAL', 1, 6, '2', 2),
            });
            expect(b.reduce()).to.eql(new stmts.BreakStatement({ loopNumber: 2, locations: { self: { ...loc, endColumn: 6 } } }));
        });

        it('should resolve to nothing', () => {
            expect(new stmts.BreakStatement({ loopNumber: 0 }).resolveType({}, {}, { '@@loopNumber': 0 })).to.eql(undefined);
        });

        it('should error for being outside loop', () => {
            const typeChecker = { errors: [] };
            (new stmts.BreakStatement({ loopNumber: 0, locations: { self: loc } })).resolveType(typeChecker, { path: '/index.ren' }, {});
            expect(typeChecker.errors.map(e => e.message)).to.eql(['"break" statement cannot be present outside loop [/index.ren:1:1]']);
            typeChecker.errors = [];
            (new stmts.BreakStatement({ loopNumber: 0, locations: { self: loc } })).resolveType(typeChecker, { path: '/index.ren' }, { '@@loopNumber': -1 });
            expect(typeChecker.errors.map(e => e.message)).to.eql(['"break" statement cannot be present outside loop [/index.ren:1:1]']);
        });

        it('should error for negative loop number', () => {
            const typeChecker = { errors: [] };
            (new stmts.BreakStatement({ loopNumber: -2, locations: { self: loc } })).resolveType(typeChecker, { path: '/index.ren' }, { '@@loopNumber': 3 });
            expect(typeChecker.errors.map(e => e.message)).to.eql(['Invalid loop number -2 in loop with depth 3 [/index.ren:1:1]']);
        });

        it('should error for too large loop number', () => {
            const typeChecker = { errors: [] };
            (new stmts.BreakStatement({ loopNumber: 5, locations: { self: loc } })).resolveType(typeChecker, { path: '/index.ren' }, { '@@loopNumber': 3 });
            expect(typeChecker.errors.map(e => e.message)).to.eql(['Invalid loop number 5 in loop with depth 3 [/index.ren:1:1]']);
        });
    });

    describe('ContinueStatement', () => {
        it('should reduce default continue statement', () => {
            const c = new stmts.ContinueStatement({ continueToken: new Token('CONTINUE', 1, 1, 'continue') });
            expect(c.reduce()).to.eql(new stmts.ContinueStatement({ loopNumber: 0, locations: { self: { ...loc, endColumn: 8 } } }));
        });

        it('should reduce continue statement with loop number', () => {
            const c = new stmts.ContinueStatement({
                continueToken: new Token('CONTINUE', 1, 1, 'continue'),
                loopNumber: new Token('INTEGER_LITERAL', 1, 9, '2', 2),
            });
            expect(c.reduce()).to.eql(new stmts.ContinueStatement({ loopNumber: 2, locations: { self: { ...loc, endColumn: 9 } } }));
        });

        it('should resolve to nothing', () => {
            expect(new stmts.ContinueStatement({ loopNumber: 0 }).resolveType({}, {}, { '@@loopNumber': 0 })).to.eql(undefined);
        });

        it('should error for being outside loop', () => {
            const typeChecker = { errors: [] };
            (new stmts.ContinueStatement({ loopNumber: 0, locations: { self: loc } })).resolveType(typeChecker, { path: '/index.ren' }, {});
            expect(typeChecker.errors.map(e => e.message)).to.eql(['"continue" statement cannot be present outside loop [/index.ren:1:1]']);
            typeChecker.errors = [];
            (new stmts.ContinueStatement({ loopNumber: 0, locations: { self: loc } })).resolveType(typeChecker, { path: '/index.ren' }, { '@@loopNumber': -1 });
            expect(typeChecker.errors.map(e => e.message)).to.eql(['"continue" statement cannot be present outside loop [/index.ren:1:1]']);
        });

        it('should error for negative loop number', () => {
            const typeChecker = { errors: [] };
            (new stmts.ContinueStatement({ loopNumber: -2, locations: { self: loc } })).resolveType(typeChecker, { path: '/index.ren' }, { '@@loopNumber': 3 });
            expect(typeChecker.errors.map(e => e.message)).to.eql(['Invalid loop number -2 in loop with depth 3 [/index.ren:1:1]']);
        });

        it('should error for too large loop number', () => {
            const typeChecker = { errors: [] };
            (new stmts.ContinueStatement({ loopNumber: 5, locations: { self: loc } })).resolveType(typeChecker, { path: '/index.ren' }, { '@@loopNumber': 3 });
            expect(typeChecker.errors.map(e => e.message)).to.eql(['Invalid loop number 5 in loop with depth 3 [/index.ren:1:1]']);
        });
    });
});
