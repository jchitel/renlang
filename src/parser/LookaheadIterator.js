export default class LookaheadIterator {
    /**
     * Create a lookahead iterator around some iterable.
     * 'lookahead' is the number of *extra* desired items to be yielded.
     * Ex: if a lookahead of 4 is specified, 5 items will be yielded (4 after the current 1).
     */
    constructor(iterable) {
        this.baseIterator = iterable[Symbol.iterator]();
        this.buffer = [];
        this.offset = 0;
    }

    /**
     * Set up the iterable interface to just return itself.
     */
    [Symbol.iterator]() {
        return this;
    }

    /**
     * Return the next item in the iterator, shifting the offset forward
     */
    next() {
        if (this.buffer.length) {
            // if there are items in the buffer, take them from there first
            this.offset++;
            return { done: false, value: this.buffer.shift() };
        } else {
            // otherwise, iterate the next item
            const next = this.baseIterator.next();
            if (!next.done) this.offset++;
            return next;
        }
    }

    /**
     * Look ahead to subsequent items (relative to the current offset).
     * This effectively returns a slice() of the remaining items.
     */
    peek(start = 0, end = start + 1) {
        // fill the buffer if it is too small
        while (this.buffer.length < end) {
            const next = this.baseIterator.next();
            if (next.done) break; // if the iterator is empty, the buffer can't be filled anymore
            this.buffer.push(next.value);
        }
        // if only one value was requested, return that value
        if (end - start === 1) return this.buffer[start];
        // otherwise return a list
        return this.buffer.slice(start, end);
    }
}
