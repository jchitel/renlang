export default class OrderedMap<V> {
    fieldOrder: string[];
    private _values: { [key: string]: V };

    constructor() {
        this.fieldOrder = [];
        this._values = {};
    }

    add(key: string, value: V) {
        this.fieldOrder.push(key);
        this._values[key] = value;
    }

    getKey(i: number) {
        return this.fieldOrder[i];
    }

    get(key: string) {
        return this._values[key];
    }

    getValue(i: number) {
        return this.get(this.getKey(i));
    }

    get length() {
        return this.fieldOrder.length;
    }

    keys() {
        return this.fieldOrder;
    }

    values() {
        return [...this];
    }

    *[Symbol.iterator]() {
        for (const key of this.fieldOrder) {
            yield this._values[key];
        }
    }

    some(predicate: (item: V) => bool) {
        for (const i of this) {
            if (predicate(i)) return true;
        }
        return false;
    }

    map<T>(mapper: (item: V, key?: string) => T) {
        const map = new OrderedMap<T>();
        for (const key of this.fieldOrder) {
            map.add(key, mapper(this._values[key], key));
        }
        return map;
    }
}
