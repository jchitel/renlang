/**
 * Creates an array of incrementing numbers, starting at 0, of the specified length
 */
export function range(length: number) {
    return [...Array(length)].map((_, i) => i);
}

/**
 * Function to immutably set a key in a ReadonlyMap without exposing Map.
 */
export function mapSet<K, V>(map: ReadonlyMap<K, V>, key: K, value: V): ReadonlyMap<K, V> {
    const clone = new Map<K, V>(map);
    clone.set(key, value);
    return clone;
}

/**
 * Creates an instance of the specified class with the specified properties.
 * This can be used to bypass the class's constructor.
 * This should ONLY be used internally as an alternative to JS's lack
 * of constructor overloading.
 */
export function createInstance<T>(cls: Class<T>, props: Partial<T> = {}) {
    const obj = Object.create(cls.prototype);
    return Object.assign(obj, props);
}

/**
 * Clones an instance of a class, optionally overriding properties
 * with the specified properties.
 */
export function cloneInstance<T extends Object>(obj: T, props: Partial<T> = {}) {
    const clone = Object.create(Object.getPrototypeOf(obj));
    for (const key of Object.keys(obj)) {
        clone[key] = obj[key];
    }
    return Object.assign(clone, props);
}
