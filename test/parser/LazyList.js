import { expect } from 'chai';

import LazyList from '../../src/parser/LazyList';


describe('LazyList', () => {
    it('should contstruct from an iterable', () => {
        const list = [1, 2, 3];
        const lazy = new LazyList(list);
        expect(lazy.start).to.eql(0);
    });

    it('should get an item', () => {
        const list = new LazyList([1, 2, 3]);
        const [item, newList] = list.shift();
        expect(item).to.eql(1);
        expect(newList.shift()[0]).to.eql(2);
        expect(list.shift()[0]).to.eql(1);
    });

    it('should check for emptiness', () => {
        expect(new LazyList([]).empty()).to.eql(true);
        expect(new LazyList([1]).empty()).to.eql(false);
    });

    it('should get more than one item', () => {
        const list = new LazyList([1, 2, 3]);
        expect(list.shift(3)[0]).to.eql([1, 2, 3]);
        expect(list.shift(5)[0]).to.eql([1, 2, 3]);
        expect(list.shift(3)[1].empty()).to.eql(true);
    });

    it('should peek', () => {
        const list = new LazyList([1, 2, 3]);
        expect(list.peek()).to.eql(1);
        expect(list.peek(2)).to.eql([1, 2]);
        expect(list.peek(3)).to.eql([1, 2, 3]);
    });
});
