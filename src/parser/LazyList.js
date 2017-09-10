class LazyListSource {
    constructor(iterator) {
        this.iterator = iterator;
        this.list = [];
        this.done = false;
    }

    requestItems(start, count) {
        while (start + count > this.list.length && !this.done) {
            const next = this.iterator.next();
            if (next.done) {
                this.done = true;
            } else {
                this.list.push(next.value);
            }
        }
        return this.list.slice(start, start + count);
    }
}

/**
 * A lazy list is the effective equivalent of a Haskell list.
 * It is an immutable structure that is constructed from back to front
 * and destructured from front to back.
 * To enforce this immutable property, the list can be constructed lazily
 * from front to back by placing items onto a lazy "thunk", which is
 * an operation that will resolve to the remainder of the list (which can also
 * contain more thunks) when it is requested, much like JS's iterators.
 *
 * To allow this lazy property to work with JS, this structure will be backed
 * by an iterator.
 *
 * Such structures will make it much easier to implement operations that require
 * immutability, but with far less overhead than alternatives.
 */
export default class LazyList {
    constructor(iterable) {
        // create a new lazy list source from the iterable,
        // which will provide the items for this list and any lists created from this one
        this.source = new LazyListSource(iterable[Symbol.iterator]());
        // this is the starting item for this list, this value will never change
        this.start = 0;
    }

    /**
     * This is like a "pop" operation to grab the first item from the list,
     * returning the item and a new list for the remainder.
     * Optionally, the "num" parameter can be provided which will return a list
     * of items as opposed to just one item.
     */
    shift(num = null) {
        if (num === null) {
            const [item] = this.source.requestItems(this.start, 1);
            const list = this._createNewList(this.start + 1);
            return [item, list];
        } else {
            const items = this.source.requestItems(this.start, num);
            const list = this._createNewList(this.start + num);
            return [items, list];
        }
    }

    /**
     * Same as shift(), but doesn't return a new list as well
     */
    peek(num = null) {
        if (num === null) {
            return this.source.requestItems(this.start, 1)[0];
        } else {
            return this.source.requestItems(this.start, num);
        }
    }

    /**
     * Returns true if this list is empty, false otherwise.
     */
    empty() {
        // enumerate just one more item to determine if the source's iterator is done
        this.source.requestItems(this.start, 1);
        return this.source.done && this.start >= this.source.list.length;
    }

    /**
     * Generate a new LazyList instance from this one, with the provided start value
     * @private
     */
    _createNewList(newStart) {
        const newList = Object.create(LazyList.prototype);
        newList.source = this.source;
        newList.start = newStart;
        return newList;
    }
}
