/**
 * Short and sweet: create an object of the specified class type
 * with the specified properties. 
 */
export function create(cls: Function, props: {}) {
    return Object.assign(Object.create(cls.prototype), props);
}
