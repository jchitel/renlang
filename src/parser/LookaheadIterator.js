class Iterator {
    constructor(li) {
        this.li = li;
        this.generator = this.li.generator();
    }

    /**
     * forwards the offset from the lookahead iterator
     */
    get offset() {
        return this.li.offset;
    }

    /**
     * Iterator next() function
     */
    next() {
        return this.generator.next();
    }

    /**
     * If trying to get an iterator from the iterator, just return itself
     */
    [Symbol.iterator]() {
        return this;
    }
}

export default class LookaheadIterator {
    /**
     * Create a lookahead iterator around some iterable.
     * 'lookahead' is the number of *extra* desired items to be yielded.
     * Ex: if a lookahead of 4 is specified, 5 items will be yielded (4 after the current 1).
     */
    constructor(iterable, lookahead = 1) {
        this.baseIterator = iterable[Symbol.iterator]();
        this.lookahead = lookahead;
        this.buffer = [];
        this.offset = 0;
        this.iterator = new Iterator(this);
    }

    /**
     * The actual iterator will be one of these, so that we have an object to target
     * @returns {Iterator}
     */
    [Symbol.iterator]() {
        return this.iterator;
    }

    /**
     * Generator function, the actual iteration logic
     */
    *generator() {
        for (const item of this.baseIterator) {
            if (this.buffer.length < this.lookahead) {
                // build the lookahead buffer
                this.buffer.push(item);
            } else {
                // push on the most recent item (will be the end of the lookahead buffer)
                this.buffer.push(item);
                // yield a copy of the buffer
                this.offset++;
                yield [...this.buffer];
                // pop the first item off the buffer
                this.buffer.shift();
            }
        }
        // once we've reached the end, we have to flush the lookahead buffer
        while (this.buffer.length) {
            // yield the current copy of the buffer
            yield [...this.buffer];
            // remove the start item
            this.buffer.shift();
        }
    }
}
