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
