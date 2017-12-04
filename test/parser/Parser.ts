import { assert } from 'chai';

import Parser, { parser, nonTerminal, exp } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';
import ASTNode from '~/syntax/ASTNode';
import { create } from '~test/parser/test-utils';


describe('Parser', () => {
    describe('@parser decorator', () => {
        it('should define sequence in the correct order', () => {
            class TestNode {
                @parser('a') setA() {}
                @parser('b') setB() {}
                @parser('c') setC() {}
            }
            const entries = Reflect.get(TestNode, 'parser');
            assert.containSubset(entries, [{
                methodName: 'setA',
                exp: { tokenImage: 'a' },
            }, {
                methodName: 'setB',
                exp: { tokenImage: 'b' },
            }, {
                methodName: 'setC',
                exp: { tokenImage: 'c' },
            }]);
        })
    });

    describe('@nonTerminal decorator', () => {
        it('should define abstract non-terminal', () => {
            @nonTerminal({ abstract: true })
            class TestNode {}
            const cfg = Reflect.get(TestNode, 'abstract');
            assert.deepEqual(cfg, { choices: [], suffixes: [] });
        });

        it('should throw if implementing a non-abstract non-terminal', () => {
            class TestNode {}
            assert.throws(() => {
                // @ts-ignore a class name is required
                @nonTerminal({ implements: TestNode }) class ImplementingNode {}
            }, 'Non-terminal cannot implement non-abstract non-terminal');
        });

        it('should add an implementing non-terminal as a choice', () => {
            @nonTerminal({ abstract: true }) abstract class AbstractNode extends ASTNode {}
            @nonTerminal({ implements: AbstractNode }) class ImplementingNode {}
            
            const choices = Reflect.get(AbstractNode, 'abstract').choices.map((e: any) => e.nonTerminal);
            assert.deepEqual(choices, [ImplementingNode]);
        });

        it('should insert an implementor before a specified list', () => {
            @nonTerminal({ abstract: true }) abstract class AbstractNode extends ASTNode {}
            @nonTerminal({ implements: AbstractNode }) abstract class ImplC extends AbstractNode {}
            @nonTerminal({ implements: AbstractNode, before: [ImplC] }) abstract class ImplB extends AbstractNode {}
            @nonTerminal({ implements: AbstractNode, before: [ImplB, ImplC] }) class ImplA {}
            @nonTerminal({ implements: AbstractNode, before: [] }) class Impl0 {}

            const choices = Reflect.get(AbstractNode, 'abstract').choices.map((e: any) => e.nonTerminal);
            assert.deepEqual(choices, [ImplA, ImplB, ImplC, Impl0]);
        });

        it('should add an implementing non-terminal as a left-recursive suffix', () => {
            @nonTerminal({ abstract: true }) abstract class AbstractNode extends ASTNode {}
            @nonTerminal({ implements: AbstractNode, leftRecursive: 'a' }) class LeftRecursive {}

            const suffixes = Reflect.get(AbstractNode, 'abstract').suffixes.map((e: any) => ({ baseName: e.baseName, exp: e.exp.nonTerminal }));
            assert.deepEqual(suffixes, [{ baseName: 'a', exp: LeftRecursive }]);
        });

        it('should insert an implementing left-recursive non-terminal before a specified list', () => {
            @nonTerminal({ abstract: true }) abstract class AbstractNode extends ASTNode {}
            @nonTerminal({ implements: AbstractNode, leftRecursive: 'c' }) abstract class ImplC extends AbstractNode {}
            @nonTerminal({ implements: AbstractNode, leftRecursive: 'b', before: [ImplC] }) abstract class ImplB extends AbstractNode {}
            @nonTerminal({ implements: AbstractNode, leftRecursive: 'a', before: [ImplB, ImplC] }) class ImplA {}
            @nonTerminal({ implements: AbstractNode, leftRecursive: '0', before: [] }) class Impl0 {}

            const choices = Reflect.get(AbstractNode, 'abstract').suffixes.map((e: any) => ({ baseName: e.baseName, exp: e.exp.nonTerminal }));
            assert.deepEqual(choices, [
                { baseName: 'a', exp: ImplA },
                { baseName: 'b', exp: ImplB },
                { baseName: 'c', exp: ImplC },
                { baseName: '0', exp: Impl0 }
            ]);
        });
    });

    describe('class', () => {
        it('should parse token by type', () => {
            const parser = new Parser('abc');
            const parsed = parser.parseTokenType(TokenType.IDENT);
            assert.strictEqual(parsed.image, 'abc');

            assert.throws(() => new Parser('abc').parseTokenType(TokenType.INTEGER_LITERAL));
        });

        it('should parse token by image', () => {
            const parser = new Parser('abc');
            const parsed = parser.parseTokenImage('abc');
            assert.strictEqual(parsed.image, 'abc');

            assert.throws(() => new Parser('abc').parseTokenImage('abcd'));
        });

        it('should parse sequential non-terminal class', () => {
            abstract class TestNode extends ASTNode {
                @parser('a', { definite: true }) setA(token: Token) { this.a = token.image; }
                @parser('b') setB(token: Token) { this.b = token.image; }
                @parser('c') setC(token: Token) { this.c = token.image; }
                a: string; b: string; c: string;
            }

            const p = new Parser('a b c');
            const parsed = p.parseNonTerminal(TestNode);
            assert.instanceOf(parsed, TestNode);
            assert.containSubset(parsed, { a: 'a', b: 'b', c: 'c' });
        });

        it('should parse abstract non-terminal class', () => {
            @nonTerminal({ abstract: true })
            abstract class Abstract extends ASTNode {
                me: string;
            }
            @nonTerminal({ implements: Abstract })
            // @ts-ignore unused
            abstract class A extends Abstract {
                @parser('a', { definite: true }) setMe(token: Token) { this.me = token.image; }
            }
            @nonTerminal({ implements: Abstract })
            // @ts-ignore unused
            abstract class B extends Abstract {
                @parser('b', { definite: true }) setMe(token: Token) { this.me = token.image; }
            }

            const p = new Parser('b');
            const parsed = p.parseNonTerminal(Abstract);
            assert.instanceOf(parsed, B);
            assert.containSubset(parsed, { me: 'b' });
        });

        it('should parse sequence', () => {
            const p = new Parser('a b c');
            const parsed = p.parseSequence({ a: exp('a', { definite: true }), b: 'b', c: 'c' });
            assert.containSubset(parsed, { a: { image: 'a' }, b: { image: 'b' }, c: { image: 'c' } });
        });

        it('should parse choices', () => {
            const p = new Parser('b');
            const parsed = p.parseChoices([exp('a', { definite: true }), exp('b', { definite: true })]);
            assert.containSubset(parsed, { image: 'b' });

            assert.throws(() => new Parser('b').parseChoices([]));
        });

        it('should parse left-recursive abstract non-terminal', () => {
            @nonTerminal({ abstract: true }) abstract class Abstract extends ASTNode {}
            // @ts-ignore unused class
            @nonTerminal({ implements: Abstract }) abstract class Choice extends Abstract {
                @parser('a', { definite: true }) setA(token: Token) { this.a = token.image; }
                a: string;
            }
            @nonTerminal({ implements: Abstract, leftRecursive: 'setLR' })
            // @ts-ignore unused class
            abstract class LeftRecursive1 extends Abstract {
                setLR(a: Abstract) { this.abstract = a; }
                @parser('b', { definite: true }) setB(token: Token) { this.b = token.image; }
                abstract: Abstract;
                b: string;
            }
            @nonTerminal({ implements: Abstract, leftRecursive: 'setLR' })
            abstract class LeftRecursive2 extends Abstract {
                setLR(a: Abstract) { this.abstract = a; }
                @parser('c', { definite: true }) setC(token: Token) { this.c = token.image; }
                abstract: Abstract;
                c: string;
            }

            const p = new Parser('a b c b b c c');
            const parsed = p.parseNonTerminal(Abstract);
            assert.deepEqual(parsed, create(LeftRecursive2, {
                c: 'c',
                abstract: create(LeftRecursive2, {
                    c: 'c',
                    abstract: create(LeftRecursive1, {
                        b: 'b',
                        abstract: create(LeftRecursive1, {
                            b: 'b',
                            abstract: create(LeftRecursive2, {
                                c: 'c',
                                abstract: create(LeftRecursive1, {
                                    b: 'b',
                                    abstract: create(Choice, { a: 'a' })
                                })
                            })
                        })
                    })
                })
            }));
        });

        it('should throw for no defined "definite" expression', () => {
            assert.throws(() => new Parser('a').parseSequence({ a: 'a' }), 'No definite set on a sequential expansion');
        });

        it('should throw for failed required expressions', () => {
            assert.throws(() => new Parser('a').parseSequence({ b: exp('b', { definite: true, err: 'INVALID_EXPRESSION' }) }), 'Invalid expression');
        });

        it('should ignore failed optional expressions', () => {
            const parsed = new Parser('a').parseSequence({ b: exp('b', { definite: true, optional: true }) });
            assert.deepEqual(parsed, {});
        });

        it('should parse basic * repetition', () => {
            const parsed = new Parser('a a a').parseSequence({ a: exp('a', { definite: true, repeat: '*' }) });
            assert.containSubset(parsed, { a: { length: 3 } });
        });

        it('should parse basic + repetition', () => {
            const parsed = new Parser('a a a').parseSequence({ a: exp('a', { definite: true, repeat: '+' }) });
            assert.containSubset(parsed, { a: { length: 3 } });
        });

        it('should error for non-satisfied + repetition', () => {
            assert.throws(() => {
                new Parser('b').parseSequence({ a: exp('a', { definite: true, repeat: '+', err: 'INVALID_EXPRESSION' }) });
            }, 'Invalid expression');
        });

        it('should parse repetition with separator', () => {
            const parsed = new Parser('a,a,a').parseSequence({ a: exp('a', { definite: true, repeat: '*', sep: TokenType.COMMA }) });
            assert.containSubset(parsed, {
                a: { length: 3 },
                a_sep: { length: 2, 0: { image: ',' }, 1: { image: ',' } }
            });
        });

        it('should error for missing expression after separator', () => {
            assert.throws(() => {
                new Parser('a,').parseSequence({ a: exp('a', { definite: true, repeat: '*', sep: TokenType.COMMA, err: 'INVALID_EXPRESSION' }) });
            }, 'Invalid expression');
        });

        it('should flatten a result', () => {
            const parsed = new Parser('a b').parseSequence({
                awef: exp({
                    a: exp('a', { definite: true }),
                    b: 'b',
                }, { definite: true, flatten: true }),
            });
            assert.containSubset(parsed, {
                a: { image: 'a' },
                b: { image: 'b' },
            });
        });
    });
});
