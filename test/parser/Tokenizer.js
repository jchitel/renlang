import { expect } from 'chai';

import Tokenizer, { Token } from '../../src/parser/Tokenizer';


describe('Tokenizer', () => {
    it('should construct an iterator', () => {
        const tokenizer = new Tokenizer('hello');
        expect(tokenizer.iterator[Symbol.iterator]().next().value).to.eql(['h', 'e', 'l', 'l', 'o']);
    });

    it('should consume an identifier', () => {
        const tokenizer = new Tokenizer('hello');
        expect([...tokenizer]).to.eql([
            new Token('IDENT', 0, 'hello'),
            new Token('EOF', 5, null),
        ]);
    });
});
