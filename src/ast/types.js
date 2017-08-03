import ASTNode from './ASTNode';


export class Type extends ASTNode {
    reduce() {
        if (this.builtIn) {
            return new PrimitiveType(this.builtIn.image, this.builtIn.getLocation());
        } else if (this.name) {
            return new IdentifierType(this.name.image, this.name.getLocation());
        } else if (this.functionType) {
            return this.functionType.reduce();
        } else if (this.tupleType) {
            return this.tupleType.reduce();
        } else if (this.structType) {
            return this.structType.reduce();
        } else if (this.arrayType) {
            return this.arrayType.reduce();
        } else if (this.innerType) {
            const node = this._createNewNode();
            node.parenthesized = this.innerType.reduce();
            node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
            return node;
        } else {
            throw new Error('Invalid Type node');
        }
    }
}

export class PrimitiveType extends ASTNode {
    constructor(type, location) {
        super({ type });
        this.registerLocation('self', location);
    }
}

export class IdentifierType extends ASTNode {
    constructor(name, location) {
        super({ name });
        this.registerLocation('self', location);
    }
}

export class FunctionType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.paramTypes = this.paramTypes.map(t => t.reduce());
        node.returnType = this.returnType.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), node.returnType.locations.self);
        return node;
    }
}

export class TupleType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.types = this.types.map(t => t.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}

export class StructType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.fields = [];
        for (let i = 0; i < this.fieldTypes.length; ++i) {
            node.fields.push({ type: this.fieldTypes[i].reduce(), name: this.fieldNameTokens[i].image });
            node.registerLocation(`field_${this.fieldNameTokens[i].image}`, this.fieldNameTokens[i].getLocation());
        }
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}

export class ArrayType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.baseType = this.baseType.reduce();
        node.createAndRegisterLocation('self', node.baseType.locations.self, this.closeBracketToken.getLocation());
        return node;
    }
}
