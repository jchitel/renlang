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
        this.gen = this._generator();
    }

    /**
     * Set up the iterable interface to just return itself.
     */
    [Symbol.iterator]() {
        return this;
    }

    /**
     * Iteration should defer to the generator.
     */
    next() {
        return this.gen.next();
    }

    /**
     * This generator contains the actual iteration logic.
     */
    *_generator() {
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
            this.offset++;
            yield [...this.buffer];
            // remove the start item
            this.buffer.shift();
        }
    }
}
