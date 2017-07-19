export default class LookaheadIterator {
    /**
     * Create a lookahead iterator around some iterable.
     * 'lookahead' is the number of *extra* desired items to be yielded.
     * Ex: if a lookahead of 4 is specified, 5 items will be yielded (4 after the current 1).
     */
    constructor(iterable, lookahead = 1) {
        this.iterator = iterable[Symbol.iterator]();
        this.lookahead = lookahead;
        this.buffer = [];
    }

    *[Symbol.iterator]() {
        for (const item of this.iterator) {
            if (this.buffer.length < this.lookahead) {
                // build the lookahead buffer
                this.buffer.push(item);
            } else {
                // push on the most recent item (will be the end of the lookahead buffer)
                this.buffer.push(item);
                // yield a copy of the buffer
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
