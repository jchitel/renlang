import LookaheadIterator from './LookaheadIterator';


/**
 * This iterator is designed to wrap around a LookaheadIterator that is correspondingly wrapped around a tokenizer.
 * Its job is to look for new line tokens and handle their semantics.
 * For each token peeked at or iterated, if the one that follows it is a new line, a 'hasNewLine' flag is set to true.
 * Also, each new line token that is peeked or iterated is dropped.
 */
export default class NewLineCheckIterator {
    constructor(iterator) {
        if (!(iterator instanceof LookaheadIterator)) throw new Error('NewLineCheckIterator must be wrapped around a LookaheadIterator');
        this.baseIterator = iterator;
    }

    [Symbol.iterator]() {
        return this;
    }

    next() {
        // continue looping until we get a valid token
        while (true) {
            // iterate the next value and peek at the one after it
            const next = this.baseIterator.next();
            const peek = this.baseIterator.peek();
            // if the iterator is done, return that value
            if (next.done) return next;
            // if the value is a new line, skip it
            if (next.value.type === 'NEWLINE') continue;
            // set the flag value and return it
            if (peek) next.value.hasNewLine = peek.type === 'NEWLINE';
            return next;
        }
    }

    peek(start = 0, end = start + 1) {
        // this is the array of values to be returned
        const values = [];
        // continue looping until we have received the right amount of values
        let skip = 0;
        while (values.length < end - start) {
            // peek at the next two values
            const peekStart = start + values.length + skip;
            const [peek1, peek2] = this.baseIterator.peek(peekStart, peekStart + 2);
            // if the iterator is done, return whatever we have
            if (!peek1) break;
            // if the value is a new line, skip it
            if (peek1.type === 'NEWLINE') {
                skip++;
                continue;
            }
            // set the flag and add the value
            if (peek2) peek1.hasNewLine = peek2.type === 'NEWLINE';
            values.push(peek1);
        }
        // we have as many values as we need
        return (end - start === 1) ? values[0] : values;
    }
}
