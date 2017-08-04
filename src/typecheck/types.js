export class Type {}

export class Integer extends Type {
    constructor(size, signed) {
        super();
        this.size = size;
        this.signed = signed;
    }
}

export class Float extends Type {
    constructor(size) {
        super();
        this.size = size;
    }
}

export class Char extends Type {}

export class Bool extends Type {}

export class Tuple extends Type {
    constructor(types) {
        super();
        this.types = types;
    }
}

export class Struct extends Type {
    constructor(fields) {
        super();
        this.fields = fields;
    }
}

export class Array extends Type {
    constructor(baseType) {
        super();
        this.baseType = baseType;
    }
}

export class Function extends Type {
    constructor(paramTypes, returnType) {
        super();
        this.paramTypes = paramTypes;
        this.returnType = returnType;
    }
}

/**
 * Represents an unknown type, used in cases where the type cannot be determined.
 * This will always end up being an error when it bubbles up to the top.
 */
export class Unknown extends Type {}
