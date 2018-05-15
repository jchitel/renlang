/**
 * Creates an array of incrementing numbers, starting at 0, of the specified length
 */
export function range(length: number) {
    return [...Array(length)].map((_, i) => i);
}
