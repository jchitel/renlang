/**
 * Data structure made to represent scoped names.
 * Internally, this is a stack of maps.
 * When getting a value, the stack is searched from
 * the top down, and the first scope that contains the
 * value is used. If no scope contains the value,
 * the top one is used.
 */
export default class Scope<T> {
    private scopes: { [name: string]: T }[] = [{}];

    private getScope(name: string): { [name: string]: T } {
        for (let i = this.scopes.length - 1; i >= 0; --i) {
            if (name in this.scopes[i]) return this.scopes[i];
        }
        // if the name exists at no level, return the top one
        return this.scopes[this.scopes.length - 1];
    }

    get(name: string): T {
        return this.getScope(name)[name];
    }

    set(name: string, value: T) {
        this.getScope(name)[name] = value;
    }

    push() {
        this.scopes.push({});
    }

    pop() {
        if (this.scopes.length === 1) throw new Error('Cannot pop the last entry of a scope');
        this.scopes.pop();
    }
}
