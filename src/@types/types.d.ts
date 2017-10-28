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

interface Class<T> {
    new(...args: any[]): T;
}

type Optional<T> = T | null;

type bool = boolean;
