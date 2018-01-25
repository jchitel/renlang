interface ObjectConstructor {
    /**
     * Overload Object.assign() for use with classes, which cannot be assigned properties they don't have
     */
    assign<T>(target: T, source: Partial<T>): T;

    /**
     * Overload Object.create() to be generic
     */
    create<T>(prototype: T): T;

    /**
     * Overload Object.getPrototypeOf() to be generic
     */
    getPrototypeOf<T>(object: T): T;

    keys<T>(object: T): (keyof T)[];
}

/**
 * Previously, this was `{ new(...args: any[]): T }`
 * but unfortunately that doesn't apply for abstract
 * classes, so instead we relax the callable constructor
 * constraint and just say that it must be any kind of
 * function, with a prototype of the specified type.
 */
interface Class<T extends Object> extends Function {
    prototype: T;
}

type Optional<T> = T | null;

/**
 * A read-only version of Map.
 * This is backed by a regular Map, but only exposes APIs that
 * don't mutate the map. To mutate the map, use `mapSet()`
 * from `~/utils/utils`.
 */
interface ReadonlyMap<K, V> extends Iterable<[K, V]> {
    get(key: K): V | undefined;
    has(key: K): boolean;
    readonly size: number;
}
