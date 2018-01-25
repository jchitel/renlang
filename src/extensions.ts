interface Array<T> {
    /** Get the last item in this array, or undefined if the array is empty */
    last(): T;
    /** Get the last {count} items in this array */
    last(count: number): T[];
    /** Get the number of items in this array that match the given predicate */
    count(predicate: (item: T) => boolean): number;
}

interface ReadonlyArray<T> {
    /** Get the last item in this array, or undefined if the array is empty */
    last(): T;
    /** Get the last {count} items in this array */
    last(count: number): T[];
    /** Get the number of items in this array that match the given predicate */
    count(predicate: (item: T) => boolean): number;
}

Array.prototype.last = function last(count?: number) {
    if (typeof count === 'undefined') return this[this.length - 1];
    return this.slice(this.length - count, this.length);
}

Array.prototype.count = function count<T>(predicate: (item: T) => boolean): number {
    return this.filter(predicate).length;
}

interface String {
    /** Get the substring from this string containing the last {count} characters in this string */
    last(count?: number): string;
}

String.prototype.last = function last(count = 1) {
    return this.slice(this.length - count, this.length);
}
