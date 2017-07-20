import { expect } from 'chai';

import Tokenizer from '../../src/parser/Tokenizer';


describe('Tokenizer', () => {
    it('should construct an iterator', () => {
        const tokenizer = new Tokenizer('hello');
        expect(tokenizer.iterator[Symbol.iterator]().next().value).to.eql(['h', 'e', 'l', 'l', 'o']);
    });
});
