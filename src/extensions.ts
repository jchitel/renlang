// #region Array extensions

interface Array<T> {
    /** Get the last item in this array, or undefined if the array is empty */
    last(): T;
    /** Get the last {count} items in this array */
    last(count: number): T[];
    /** Get the number of items in this array that match the given predicate */
    count(predicate: (item: T) => boolean): number;
    /** Mutates the value at the specified index using the specified mutator function, returning a new array containing the new value. */
    mutate(index: number, fn: (value: T) => T): Array<T>;
    /** Set the value at a specified index immutably, returning a new array without modifying the original */
    iset(index: number, value: T): Array<T>;
    /** Returns the array with all duplicates removed, NOTE: works only on primitives */
    unique(): Array<T>;
    /** Removes the item at the specified index, returning a new array */
    idelete(index: number): Array<T>;
}

interface ReadonlyArray<T> {
    /** Get the last item in this array, or undefined if the array is empty */
    last(): T;
    /** Get the last {count} items in this array */
    last(count: number): T[];
    /** Get the number of items in this array that match the given predicate */
    count(predicate: (item: T) => boolean): number;
    /** Mutates the value at the specified index using the specified mutator function, returning a new array containing the new value. */
    mutate(index: number, fn: (value: T) => T): ReadonlyArray<T>;
    /** Set the value at a specified index immutably, returning a new array without modifying the original */
    iset(index: number, value: T): ReadonlyArray<T>;
    /** Returns the array with all duplicates removed, NOTE: works only on primitives */
    unique(): ReadonlyArray<T>;
    /** Removes the item at the specified index, returning a new array */
    idelete(index: number): ReadonlyArray<T>;
}

Array.prototype.last = function last<T>(this: Array<T>, count?: number) {
    if (typeof count === 'undefined') return this[this.length - 1];
    return this.slice(this.length - count, this.length);
}

Array.prototype.count = function count<T>(this: Array<T>, predicate: (item: T) => boolean): number {
    return this.filter(predicate).length;
}

Array.prototype.mutate = function mutate<T>(this: Array<T>, index: number, fn: (value: T) => T): Array<T> {
    return this.iset(index, fn(this[index]));
}

Array.prototype.iset = function iset<T>(this: Array<T>, index: number, value: T): Array<T> {
    const newArray = [...this];
    newArray.splice(index, 1, value);
    return newArray;
}

Array.prototype.unique = function unique<T>(this: Array<T>): Array<T> {
    return [...new Set(this)];
}

Array.prototype.idelete = function idelete<T>(this: Array<T>, index: number): Array<T> {
    const newArray = [...this];
    newArray.splice(index, 1);
    return newArray;
}

// #endregion
// #region String extensions

interface String {
    /** Get the substring from this string containing the last {count} characters in this string */
    last(count?: number): string;
}

String.prototype.last = function last(count = 1) {
    return this.slice(this.length - count, this.length);
}

// #endregion
// #region Map extensions

interface Map<K, V> {
    /** Set the value at a specified key immutably, returning a new map object without modifying the original */
    iset(key: K, value: V): Map<K, V>;
    /** Mutate the value at a specified key immutably, returning a new map object without modifying the original */
    mutate(key: K, fn: (value: V) => V): Map<K, V>;
    /** Delete the value at a specified key immutably, returning a new map object without modifying the original */
    idelete(key: K): Map<K, V>;
}

interface ReadonlyMap<K, V> {
    /** Set the value at a specified key immutably, returning a new map object without modifying the original */
    iset(key: K, value: V): ReadonlyMap<K, V>;
    /** Mutate the value at a specified key immutably, returning a new map object without modifying the original */
    mutate(key: K, fn: (value: V) => V): ReadonlyMap<K, V>;
    /** Delete the value at a specified key immutably, returning a new map object without modifying the original */
    idelete(key: K): ReadonlyMap<K, V>;
}

Map.prototype.iset = function iset<K, V>(this: Map<K, V>, key: K, value: V): Map<K, V> {
    const clone = new Map<K, V>(this);
    clone.set(key, value);
    return clone;
}

Map.prototype.mutate = function mutate<K, V>(this: Map<K, V>, key: K, fn: (value: V) => V): Map<K, V> {
    return this.iset(key, fn(this.get(key)!));
}

Map.prototype.idelete = function idelete<K, V>(this: Map<K, V>, key: K): Map<K, V> {
    const clone = new Map<K, V>(this);
    clone.delete(key);
    return clone;
}

// #endregion
// #region Set extensions

interface Set<T> {
    /** Performs an array-like map operation on this set, returning a new set */
    map<U>(fn: (value: T) => U): Set<U>;
    /** Performs an array-like filter operation on this set, returning a new set */
    filter(predicate: (value: T) => boolean): Set<T>;
    /** Performs an array-like reduce operation on this set, returning a new set */
    reduce<U>(fn: (result: U, value: T) => U, initial: U): U;
    /** Performs an array-like flatMap operation on this set, returning a new set */
    flatMap<U>(fn: (value: T) => Iterable<U>): Set<U>;
    /** Unions this set with another iterable, forming a new set */
    union(other: Iterable<T>): Set<T>;
    /** Subtracts another iterable from this set, forming a new set containing only elements from this set that were not in the other */
    subtract(other: Set<T>): Set<T>;
}

interface ReadonlySet<T> {
    /** Performs an array-like map operation on this set, returning a new set */
    map<U>(fn: (value: T) => U): ReadonlySet<U>;
    /** Performs an array-like filter operation on this set, returning a new set */
    filter(predicate: (value: T) => boolean): ReadonlySet<T>;
    /** Performs an array-like reduce operation on this set, returning a new set */
    reduce<U>(fn: (result: U, value: T) => U, initial: U): U;
    /** Performs an array-like flatMap operation on this set, returning a new set */
    flatMap<U>(fn: (value: T) => Iterable<U>): ReadonlySet<U>;
    /** Unions this set with another set, forming a new set */
    union(other: Iterable<T>): ReadonlySet<T>;
    /** Subtracts another set from this set, forming a new set containing only elements from this set that were not in the other */
    subtract(other: ReadonlySet<T>): ReadonlySet<T>;
}

Set.prototype.map = function map<T, U>(this: Set<T>, fn: (value: T) => U): Set<U> {
    const newSet = new Set<U>();
    for (const value of this) newSet.add(fn(value));
    return newSet;
}

Set.prototype.filter = function filter<T>(this: Set<T>, predicate: (value: T) => boolean): Set<T> {
    const newSet = new Set<T>();
    for (const value of this) if (predicate(value)) newSet.add(value);
    return newSet;
}

Set.prototype.reduce = function reduce<T, U>(this: Set<T>, fn: (result: U, value: T) => U, initial: U): U {
    let result: U = initial;
    for (const value of this) result = fn(result, value);
    return result;
}

Set.prototype.flatMap = function flatMap<T, U>(this: Set<T>, fn: (value: T) => Iterable<U>): Set<U> {
    const newSet = new Set<U>();
    for (const value of this) for (const subValue of fn(value)) newSet.add(subValue);
    return newSet;
}

Set.prototype.union = function union<T>(this: Set<T>, other: Iterable<T>): Set<T> {
    const newSet = new Set(this);
    for (const value of other) newSet.add(value);
    return newSet;
}

Set.prototype.subtract = function subtract<T>(this: Set<T>, other: Set<T>): Set<T> {
    return this.filter(_ => !other.has(_));
}

// #endregion
