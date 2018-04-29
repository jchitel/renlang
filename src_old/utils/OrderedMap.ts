import { mapSet } from '~/utils/utils';

export interface OrderedMap<K, V> {
    add(key: K, value: V): OrderedMap<K, V>;
    getKey(i: number): K;
    get(key: K): V | undefined;
    getValue(i: number): V | undefined;
    size(): number;
    keys(): ReadonlyArray<K>;
    values(): ReadonlyArray<V>;
    [Symbol.iterator](): IterableIterator<V>;
    some(predicate: (item: V) => boolean): boolean;
    map<T>(mapper: (item: V, key?: K) => T): OrderedMap<K, T>;
}

interface OrderedMapInternal<K, V> extends OrderedMap<K, V> {
    readonly keyOrder: ReadonlyArray<K>;
    readonly innerMap: ReadonlyMap<K, V>;
}

export function OrderedMap<K, V>(): OrderedMap<K, V> {
    const map: OrderedMapInternal<K, V> = {
        keyOrder: [],
        innerMap: new Map(),
        add(key: K, value: V): OrderedMap<K, V> {
            const map: OrderedMapInternal<K, V> = {
                ...this,
                keyOrder: [...this.keyOrder, key],
                innerMap: mapSet(this.innerMap, key, value)
            };
            return map;
        },
        getKey(i: number): K { return this.keyOrder[i]; },
        get(key: K): V | undefined { return this.innerMap.get(key); },
        getValue(i: number): V | undefined { return this.innerMap.get(this.keyOrder[i]); },
        size(): number { return this.keyOrder.length; },
        keys(): ReadonlyArray<K> { return this.keyOrder; },
        values(): ReadonlyArray<V> { return [...this]; },
        *[Symbol.iterator](): IterableIterator<V> {
            for (const key of this.keyOrder) {
                yield this.innerMap.get(key)!;
            }
        },
        some(predicate: (item: V) => boolean): boolean {
            for (const i of this) {
                if (predicate(i)) return true;
            }
            return false;
        },
        map<T>(mapper: (item: V, key: K) => T): OrderedMap<K, T> {
            const map: OrderedMapInternal<K, T> = {
                ...OrderedMap(),
                keyOrder: this.keyOrder,
                innerMap: new Map(
                    this.keyOrder.map<[K, T]>(k => [k, mapper(this.innerMap.get(k)!, k)])
                )
            };
            return map;
        }
    }
    return map;
}
