import Lazy, { lazy } from '~/utils/lazy';


/**
 * A LazyList is a linked list composed of a head, which is a single item, and a lazily-evaluated
 * tail. Because the tail is lazily evaluated, LazyLists can be infinite. Note that the 'tail' property is
 * lazy, but it is not a Lazy value, it implements its own laziness mechanism. Additionally, a tail can either
 * be another LazyList or a special empty LazyList that has no head and no tail. It represents the end
 * of the list.
 */
export type LazyList<T> = NonEmptyLazyList<T> | EmptyLazyList<T>;

abstract class AbstractLazyList<T> implements Iterable<T> {
    abstract [Symbol.iterator](): Iterator<T>;

    // #region functional operations

    /**
     * Transforms this list by applying a mapper function to each item
     */
    abstract map<R>(mapper: (item: T) => R): LazyList<R>;

    /**
     * Applies a mapper function to each item, concatenating each yielded result into one list
     */
    abstract flatMap<R>(mapper: (item: T) => Iterable<R>): LazyList<R>;

    /**
     * Creates a new list containing only items that return true for the predicate
     */
    abstract filter(predicate: (item: T) => boolean): LazyList<T>;

    /**
     * Starting with an initial value, combine all items in this list
     * into the value using a reducer function
     */
    abstract reduce<R>(reducer: (value: R, item: T) => R, init: R): R;

    /**
     * Same as reduce(), but the initial value used is the first item of the list
     */
    abstract reduceSelf(reducer: (value: T, item: T) => T): T;

    /**
     * Appends a list to the end of this one
     */
    abstract concat(list: LazyList<T>): LazyList<T>;

    /**
     * Prepends an item to this list, returning another list.
     * NOTE: This is a constant-time operation
     */
    abstract prepend(item: T): LazyList<T>;

    /**
     * Copies each item of this list to a new one, stopping for the first item
     * that returns false for the specified predicate
     */
    abstract takeWhile(predicate?: (item: T) => boolean): LazyList<T>;

    // #endregion

    // #region shift operations

    /**
     * Returns the specified number of items from the beginning
     * of this list, as well as the tail following the last item
     */
    abstract shift(count: number): { values: T[], tail: LazyList<T> };

    /**
     * Returns only the specified number of items from the beginning
     * of this list.
     */
    abstract peek(count: number): T[];

    // #endregion
}

export class NonEmptyLazyList<T> extends AbstractLazyList<T> {
    readonly empty = false;
    private readonly _tail: Lazy<LazyList<T>>;

    constructor(readonly head: T, getTail: () => LazyList<T>) {
        super();
        this._tail = lazy(getTail);
    }
    
    public get tail(): LazyList<T> {
        return this._tail.value;
    }

    *[Symbol.iterator](): Iterator<T> {
        let list: LazyList<T> = this;
        while (!list.empty) {
            yield list.head;
            list = list.tail;
        }
    }

    public map<R>(mapper: (item: T) => R): LazyList<R> {
        return new NonEmptyLazyList(mapper(this.head), () => this.tail.map(mapper));
    }

    public flatMap<R>(mapper: (item: T) => Iterable<R>): LazyList<R> {
        const list = fromIterable(mapper(this.head));
        return list.empty
            ? this.tail.flatMap(mapper)
            : new NonEmptyLazyList(list.head, () => list.tail.concat(this.tail.flatMap(mapper)));
    }

    public filter(predicate: (item: T) => boolean): LazyList<T> {
        if (predicate(this.head)) return new NonEmptyLazyList(this.head, () => this.tail.filter(predicate));
        return this.tail.filter(predicate);
    }

    public reduce<R>(reducer: (value: R, item: T) => R, init: R): R {
        return this.tail.reduce(reducer, reducer(init, this.head));
    }

    public reduceSelf(reducer: (value: T, item: T) => T): T {
        return this.tail.reduce(reducer, this.head);
    }

    public concat(list: LazyList<T>): LazyList<T> {
        return new NonEmptyLazyList(this.head, () => this.tail.concat(list));
    }

    public prepend(item: T): LazyList<T> {
        return new NonEmptyLazyList(item, () => this);
    }

    public takeWhile(predicate?: (item: T) => boolean): LazyList<T> {
        if (!predicate) return this.takeWhile(i => !!i);
        if (predicate(this.head)) return new NonEmptyLazyList(this.head, () => this.tail.takeWhile(predicate));
        return new EmptyLazyList();
    }

    public shift(count: number): { values: T[], tail: LazyList<T> } {
        if (count === 0) return { values: [], tail: this };
        const { values, tail } = this.tail.shift(count - 1);
        return { values: [this.head, ...values], tail };
    }

    public peek(count: number): T[] {
        if (count === 0) return [];
        return [this.head, ...this.tail.peek(count - 1)];
    }
}

export class EmptyLazyList<T> extends AbstractLazyList<T> {
    readonly empty = true;

    [Symbol.iterator](): Iterator<T> {
        return { next() { return { done: true, value: {} as T } } };
    }

    map<R>(_mapper: (item: T) => R): LazyList<R> { return new EmptyLazyList<R>(); }
    flatMap<R>(_mapper: (item: T) => Iterable<R>): LazyList<R> { return new EmptyLazyList<R>(); }
    filter(_predicate: (item: T) => boolean): LazyList<T> { return new EmptyLazyList<T>(); }
    reduce<R>(_reducer: (value: R, item: T) => R, init: R): R { return init; }
    reduceSelf(_reducer: (value: T, item: T) => T): never {
        throw new Error('Cannot call reduceSelf() on an empty list. Try reduce() instead');
    }
    concat(list: LazyList<T>): LazyList<T> { return list; }
    prepend(item: T): LazyList<T> { return new NonEmptyLazyList(item, () => this); }
    takeWhile(_predicate?: (item: T) => boolean): LazyList<T> { return new EmptyLazyList(); }
    shift(_count: number): { values: T[], tail: LazyList<T> } {
        return { values: [], tail: this };
    }
    peek(_count: number) { return []; }
}

/**
 * Creates a lazy list of the provided type
 */
export function create<T>(head: T, getTail: () => LazyList<T>): LazyList<T> {
    return new NonEmptyLazyList(head, getTail);
}

/**
 * Creates a lazy list containing a single item
 */
export function single<T>(item: T): LazyList<T> {
    return new NonEmptyLazyList<T>(item, empty);
}

/**
 * Creates an empty lazy list of the provided type.
 */
export function empty<T>(): LazyList<T> {
    return new EmptyLazyList();
}

/**
 * Creates an infinitely incrementing lazy list starting
 * from the specified number (or 0 by default).
 */
export function infList(start = 0): LazyList<number> {
    return new NonEmptyLazyList(start, () => infList(start + 1));
}

/**
 * Creates a lazy list from an iterable, lazily evaluating the
 * iterable's iterator for each request of the tail.
 */
export function fromIterable<T>(iterable: Iterable<T>): LazyList<T> {
    return fromIterator(iterable[Symbol.iterator]());
}

/**
 * Creates a lazy list from an iterator, lazily evaluating the
 * iterator from its current location for each request of the tail.
 */
export function fromIterator<T>(iterator: Iterator<T>): LazyList<T> {
    const next = iterator.next();
    if (next.done) return new EmptyLazyList();
    return new NonEmptyLazyList(next.value, () => fromIterator(iterator));
}
