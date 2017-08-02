import { expect } from 'chai';

import LookaheadIterator from '../../src/parser/LookaheadIterator';
import Tokenizer from '../../src/parser/Tokenizer';
import NewLineCheckIterator from '../../src/parser/NewLineCheckIterator';


describe('NewLineCheckIterator', () => {
    it('should check for LookaheadIterator', () => {
        expect(() => new NewLineCheckIterator('hello')).to.throw();
    });

    it('should set hasNewLine flag', () => {
        const iter = new NewLineCheckIterator(new LookaheadIterator(new Tokenizer('hello\nworld newline\nanew')));

        expect(iter.peek()).to.eql({
            type: 'IDENT',
            line: 1,
            column: 1,
            image: 'hello',
            value: null,
            hasNewLine: true,
        });

        expect(iter.next().value).to.eql({
            type: 'IDENT',
            line: 1,
            column: 1,
            image: 'hello',
            value: null,
            hasNewLine: true,
        });

        expect(iter.peek()).to.eql({
            type: 'IDENT',
            line: 2,
            column: 1,
            image: 'world',
            value: null,
            hasNewLine: false,
        });

        expect(iter.peek(0, 3)).to.eql([{
            type: 'IDENT',
            line: 2,
            column: 1,
            image: 'world',
            value: null,
            hasNewLine: false,
        }, {
            type: 'IDENT',
            line: 2,
            column: 7,
            image: 'newline',
            value: null,
            hasNewLine: true,
        }, {
            type: 'IDENT',
            line: 3,
            column: 1,
            image: 'anew',
            value: null,
            hasNewLine: true, // EOF counts as a new line
        }]);
    });
});
