interface IPreVisitable<T, V> {
    preVisit(func: () => T, visitee: V): T;
}

/**
 * A decorator to specify that a "preVisit()" method should be called before
 * invoking a class's visitor methods. This method must conform to a specific
 * signature, taking a bound visitor method that can be called to invoke
 * the original visitor method, and the visitee used to invoke the visitor.
 * The preVisit() method can perform operations or set context, and it can
 * optionally not invoke the original visitor, but it must return a value
 * of the visitor's type.
 */
export default function preVisit<Visitee, T, Visitor extends IPreVisitable<T, Visitee>>() {
    return function(cls: Class<Visitor>): void {
        const visitors: Function[] = Object.values(cls.prototype)
            .filter(m => typeof m === 'function' && m.name.startsWith('visit'));
        for (const visitor of visitors) {
            Reflect.set(cls.prototype, visitor.name, function newVisitor(this: Visitor, visitee: Visitee) {
                const bound = visitor.bind(this, visitee);
                return this.preVisit(bound, visitee);
            });
        }
    }
}
