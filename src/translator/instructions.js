export default class Instruction { }

/**
 * An instruction that copies a function parameter into the function scope
 */
export class ParamToScope extends Instruction {
    constructor(index, name) {
        super();
        this.index = index;
        this.name = name;
    }
}

/**
 * An instruction that returns from the function
 * and exposes the return value as the resulting reference
 * of the expression where the function was called.
 */
export class Return extends Instruction {
    constructor(ref) {
        super();
        this.ref = ref;
    }
}

/**
 * An instruction that does nothing, useful for jump targets
 */
export class Noop extends Instruction {}

/**
 * All values at runtime have two types: scope variables
 * and references. Scope variables have names and are
 * accessible from code, they are simply variables in the
 * language. References are internal variables that
 * are only accessible by the runtime.
 *
 * The CreateReference instruction creates a new reference
 * and initializes it to the provided value. References
 * are only accessible via a Reference instance or a
 * CreateReference instance, so they must be held onto.
 */
export class CreateReference extends Instruction {
    constructor(initialValue) {
        super();
        this.initialValue = initialValue;
    }
}

/**
 * The InteropReference instruction creates a reference
 * that is the result of a JS operation on a variable
 * amount of other references.
 * The references parameter is a list of reference instances.
 * The operation parameter is a JS function that will receive
 * the reference instances in the order that they are specified
 * in the references array.
 * When the reference is created, the reference instances are
 * passed into the operation function, and the return value
 * will be used as the value of the function.
 */
export class InteropReference extends Instruction {
    constructor(references, operation) {
        super();
        this.references = references;
        this.operation = operation;
    }
}

/**
 * If the reference evaluates to falsy, jumps to the target.
 * Otherwise just passes through to the next instruction.
 */
export class FalseBranch extends Instruction {
    constructor(reference, target) {
        super();
        this.reference = reference;
        this.target = target;
    }
}

/**
 * If the reference evaluates to truthy, jumps to the target.
 * Otherwise just passes through to the next instruction.
 */
export class TrueBranch extends Instruction {
    constructor(reference, target) {
        super();
        this.reference = reference;
        this.target = target;
    }
}

/**
 * Adds a variable to the scope of the function.
 * The initial value can be either a value or a reference.
 */
export class AddToScope extends Instruction {
    constructor(name, initialValue) {
        super();
        this.name = name;
        this.initialValue = initialValue;
    }
}

/**
 * Removes a variable from the scope of the function.
 */
export class RemoveFromScope extends Instruction {
    constructor(name) {
        super();
        this.name = name;
    }
}

/**
 * Mutates a reference value.
 * The mutator function will receive the reference value
 * and should return the value to be set to the reference.
 */
export class ReferenceMutate extends Instruction {
    constructor(ref, mutator) {
        super();
        this.ref = ref;
        this.mutator = mutator;
    }
}

/**
 * Unconditionally jumps to the target instruction.
 */
export class Jump extends Instruction {
    constructor(target) {
        super();
        this.target = target;
    }
}
