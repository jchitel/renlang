import { openSync as open, readSync as read } from 'fs';
import { StringDecoder } from 'string_decoder';
import { LazyList, NonEmptyLazyList, fromIterable, infList } from '~/utils/lazy-list';
import { FilePosition, CoreObject } from '~/core';


export type CharStream = EmptyCharStream | NonEmptyCharStream;

export class EmptyCharStream extends CoreObject {
    readonly empty = true;

    constructor(
        /** The file position of the end of the file */
        readonly position: FilePosition
    ) {
        super();
    }
}

export class NonEmptyCharStream extends CoreObject {
    readonly empty = false;

    constructor(
        /** The file position of the next character in the stream */
        readonly position: FilePosition,
        private readonly list: NonEmptyLazyList<string>
    ) {
        super();
    }

    /** Reads one character from the stream and returns it */
    first(): string {
        return this.list.head;
    }

    /** Reads one character from the stream, and returns it with the remaining stream */
    read(): { char: string, stream: CharStream } {
        const char = this.list.head;
        const empty = this.list.tail.empty;
        const position = char === '\n' ? this.position.nextLine() : this.position.nextColumn();
        if (empty) return { char, stream: new EmptyCharStream(position) };
        return {
            char,
            stream: this.clone({ list: this.list.tail, position }),
        }
    }

    /** Reads as many characters from the stream as possible, up to {count} */
    forceRead(count: number): { chars: string, stream: CharStream } {
        // if we don't need any more, return the base of the recursion
        if (count === 0) return { chars: '', stream: this };
        // read one from the front
        const { char, stream } = this.read();
        // if it's now empty, just return that
        if (stream.empty) return { chars: char, stream };
        // otherwise we've reached the recursion state, descend one level
        const { chars, stream: stream1 } = stream.forceRead(count - 1);
        // prepend the current character
        return { chars: char + chars, stream: stream1 };
    }
}

/**
 * Reads a single byte from a file at the specified position.
 * If the position is higher than the length of the file,
 * a buffer of length 0 will be returned.
 */
function readByte(fd: number, position: number) {
    const buf = new Buffer(1);
    const bytesRead = read(fd, buf, 0, 1, position);
    return bytesRead ? buf : new Buffer(0);
}

/**
 * Returns a lazy list of bytes from the file at the specified path.
 */
function createByteStream(path: string): LazyList<Buffer> {
    const fd = open(path, 'r');
    return infList()
        .map(i => readByte(fd, i))
        .takeWhile(b => b.length > 0);
}

/**
 * Returns a lazy list of characters from the file at the specified path.
 */
export default function createCharStream(path: string): CharStream {
    const decoder = new StringDecoder('utf8');
    const list = createByteStream(path)
        .flatMap(byte => decoder.write(byte))
        .concat(fromIterable(decoder.end()));
    if (list.empty) return new EmptyCharStream(new FilePosition(path, [1, 1]));
    return new NonEmptyCharStream(new FilePosition(path, [1, 1]), list);
}
