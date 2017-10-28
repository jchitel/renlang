export default class OrderedMap<V> {
    fieldOrder: string[];
    values: { [key: string]: V };

    constructor() {
        this.fieldOrder = [];
        this.values = {};
    }

    add(key: string, value: V) {
        this.fieldOrder.push(key);
        this.values[key] = value;
    }

    getKey(i: number) {
        return this.fieldOrder[i];
    }

    get(key: string) {
        return this.values[key];
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

    *[Symbol.iterator]() {
        for (const key of this.fieldOrder) {
            yield this.values[key];
        }
    }
}
