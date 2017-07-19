import { expect } from 'chai';

import LookaheadIterator from '../../src/parser/LookaheadIterator';


describe('LookaheadIterator', () => {
    it('should yield lookahead buffers', () => {
        const iterator = new LookaheadIterator('hello world', 4);
        expect([...iterator]).to.eql([
            ['h', 'e', 'l', 'l', 'o'],
            ['e', 'l', 'l', 'o', ' '],
            ['l', 'l', 'o', ' ', 'w'],
            ['l', 'o', ' ', 'w', 'o'],
            ['o', ' ', 'w', 'o', 'r'],
            [' ', 'w', 'o', 'r', 'l'],
            ['w', 'o', 'r', 'l', 'd'],
            ['o', 'r', 'l', 'd'],
            ['r', 'l', 'd'],
            ['l', 'd'],
            ['d'],
        ]);
    });

    it('should default to 1 item of lookahead', () => {
        const iterator = new LookaheadIterator('hello world');
        expect([...iterator]).to.eql([
            ['h', 'e'],
            ['e', 'l'],
            ['l', 'l'],
            ['l', 'o'],
            ['o', ' '],
            [' ', 'w'],
            ['w', 'o'],
            ['o', 'r'],
            ['r', 'l'],
            ['l', 'd'],
            ['d'],
        ]);
    });
});
