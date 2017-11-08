import { assert } from 'chai';

import LazyList from '~/parser/LazyList';


describe('LazyList', () => {
    it('should contstruct from an iterable', () => {
        const list = [1, 2, 3];
        const lazy = new LazyList(list);
        assert.strictEqual(lazy.start, 0);
    });

    it('should get an item', () => {
        const list = new LazyList([1, 2, 3]);
        const [item, newList] = list.shift();
        assert.strictEqual(item, 1);
        assert.strictEqual(newList.shift()[0], 2);
        assert.strictEqual(list.shift()[0], 1);
    });

    it('should check for emptiness', () => {
        assert.isTrue(new LazyList([]).empty());
        assert.isFalse(new LazyList([1]).empty());
    });

    it('should get more than one item', () => {
        const list = new LazyList([1, 2, 3]);
        assert.deepEqual(list.shifts(3)[0], [1, 2, 3]);
        assert.deepEqual(list.shifts(5)[0], [1, 2, 3]);
        assert.isTrue(list.shifts(3)[1].empty());
    });

    it('should peek', () => {
        const list = new LazyList([1, 2, 3]);
        assert.strictEqual(list.peek(), 1);
        assert.deepEqual(list.peeks(2), [1, 2]);
        assert.deepEqual(list.peeks(3), [1, 2, 3]);
    });
});
