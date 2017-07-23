import { expect } from 'chai';

import LookaheadIterator from '../../src/parser/LookaheadIterator';


describe('LookaheadIterator', () => {
    it('should behave like a standard iterator', () => {
        const iterator = new LookaheadIterator('hello world');
        expect([...iterator]).to.eql(['h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd']);
    });

    it('should allow peeking ahead to subsequent items', () => {
        const iterator = new LookaheadIterator('hello world');
        expect(iterator.peek()).to.eql('h');
        expect(iterator.next().value).to.eql('h');
        expect(iterator.peek()).to.eql('e');
        expect(iterator.peek(1)).to.eql('l');
        expect(iterator.peek(1, 3)).to.eql(['l', 'l']);
        expect(iterator.peek(1, 20)).to.eql(['l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd']);
        expect([...iterator]).to.eql(['e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd']);
        expect(iterator.peek()).to.eql(undefined);
        expect(iterator.peek(0, 2)).to.eql([]);
    });
});
