export class TType {}

export class TInteger extends TType {
    constructor(size, signed) {
        super();
        this.size = size;
        this.signed = signed;
    }
}

export class TFloat extends TType {
    constructor(size) {
        super();
        this.size = size;
    }
}

export class TChar extends TType {}

export class TBool extends TType {}

export class TTuple extends TType {
    constructor(types) {
        super();
        this.types = types;
    }
}

export class TStruct extends TType {
    constructor(fields) {
        super();
        this.fields = fields;
    }
}

export class TArray extends TType {
    constructor(baseType) {
        super();
        this.baseType = baseType;
    }
}

export class TFunction extends TType {
    constructor(paramTypes, returnType) {
        super();
        this.paramTypes = paramTypes;
        this.returnType = returnType;
    }
}

export class TUnion extends TType {
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
}

/**
 * Represents an unknown type, used in cases where the type cannot be determined.
 * This will always end up being an error when it bubbles up to the top.
 */
export class TUnknown extends TType {}
