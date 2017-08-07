import ASTNode from './ASTNode';
import { TInteger, TFloat, TChar, TBool, TArray, TTuple, TStruct, TFunction, TUnknown, TAny } from '../typecheck/types';


export class Expression extends ASTNode {
    reduce() {
        if (this.integerLiteralToken) {
            return new IntegerLiteral(this.integerLiteralToken.value, this.integerLiteralToken.getLocation());
        } else if (this.floatLiteralToken) {
            return new FloatLiteral(this.floatLiteralToken.value, this.floatLiteralToken.getLocation());
        } else if (this.characterLiteralToken) {
            return new CharLiteral(this.characterLiteralToken.value, this.characterLiteralToken.getLocation());
        } else if (this.stringLiteralToken) {
            return new StringLiteral(this.stringLiteralToken.value, this.stringLiteralToken.getLocation());
        } else if (this.boolLiteralToken) {
            return new BoolLiteral(this.boolLiteralToken.image, this.boolLiteralToken.getLocation());
        } else if (this.identToken) {
            return new IdentifierExpression(this.identToken.image, this.identifierToken.getLocation());
        } else if (this.arrayLiteral) {
            return this.arrayLiteral.reduce();
        } else if (this.tupleLiteral) {
            return this.tupleLiteral.reduce();
        } else if (this.structLiteral) {
            return this.structLiteral.reduce();
        } else if (this.lambda) {
            return this.lambda.reduce();
        } else if (this.unary) {
            return this.unary.reduce();
        } else if (this.binary) {
            return this.binary.reduce();
        } else if (this.ifElse) {
            return this.ifElse.reduce();
        } else if (this.varDecl) {
            return this.varDecl.reduce();
        } else if (this.functionApplication) {
            return this.functionApplication.reduce();
        } else if (this.fieldAccess) {
            return this.fieldAccess.reduce();
        } else if (this.arrayAccess) {
            return this.arrayAccess.reduce();
        } else if (this.innerExpression) {
            const node = this._createNewNode();
            node.parenthesized = this.innerExpression.reduce();
            node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
            return node;
        } else {
            throw new Error('Invalid Expression node');
        }
    }

    resolveType(typeChecker, module, symbolTable, expectedType) {
        return this.type = this.parenthesized.resolveType(typeChecker, module, symbolTable, expectedType);
    }
}

export class IntegerLiteral extends ASTNode {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    resolveType(typeChecker, module, symbolTable, expectedType) {
        // if the expected type is not an integer or the integer value is outside the set specified by the expected type, it's an error
        if (!(expectedType instanceof TInteger) || !expectedType.isValidValue(this.value)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(this.estimateType(), expectedType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        return this.type = expectedType;
    }

    estimateType() {
        let signed, size;
        if (this.value < 0) {
            signed = true;
            if ((-this.value) < (2**7)) size = 8;
            else if ((-this.value) < (2**15)) size = 16;
            else if ((-this.value) < (2**31)) size = 32;
            else if (this.value > -(2**63)) size = 64; // TODO: not sure this is possible to calculate this way
            else size = Infinity;
        } else {
            signed = false;
            if (this.value < (2**8)) size = 8;
            else if (this.value < (2**16)) size = 16;
            else if (this.value < (2**32)) size = 32;
            else if (this.value < (2**64)) size = 64; // TODO: not sure this is possible to calculate this way
            else size = Infinity;
        }
        return new TInteger(size, signed);
    }
}

export class FloatLiteral extends ASTNode {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    resolveType(typeChecker, module, symbolTable, expectedType) {
        // if the expected type is not a float or the float value is outside the set specified by the expected type, it's an error
        if (!(expectedType instanceof TFloat) || !expectedType.isValidValue(this.value)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(this.estimateType(), expectedType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        return this.type = expectedType;
    }

    estimateType() {
        return new TFloat(64); // TODO: add this logic
    }
}

export class CharLiteral extends ASTNode {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    resolveType(typeChecker, module, symbolTable, expectedType) {
        if (!(expectedType instanceof TChar)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(new TChar(), expectedType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        return this.type = expectedType;
    }
}

export class StringLiteral extends ASTNode {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    resolveType(typeChecker, module, symbolTable, expectedType) {
        if (!(expectedType instanceof TArray) || !(expectedType.baseType instanceof TChar)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(new TArray(new TChar()), expectedType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        return this.type = expectedType;
    }
}

export class BoolLiteral extends ASTNode {
    constructor(image, location) {
        super({ value: image === 'true' });
        this.registerLocation('self', location);
    }

    resolveType(typeChecker, module, symbolTable, expectedType) {
        if (!(expectedType instanceof TBool)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(new TBool(), expectedType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        return this.type = expectedType;
    }
}

export class IdentifierExpression extends ASTNode {
    constructor(name, location) {
        super({ name });
        this.registerLocation('self', location);
    }

    resolveType(typeChecker, module, symbolTable, expectedType) {
        let actualType = symbolTable[this.name];
        if (!actualType) {
            actualType = typeChecker.getValueType(module, this.name);
        }
        if (!actualType) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_DEFINES(this.name), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        if (!expectedType.isAssignableFrom(actualType)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(actualType, expectedType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        return this.type = expectedType;
    }
}

export class ArrayLiteral extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openBracketToken.getLocation(), this.closeBracketToken.getLocation());
        return node;
    }

    // TODO: how to relate this to isAssignableFrom()
    resolveType(typeChecker, module, symbolTable, expectedType) {
        if (!(expectedType instanceof TArray)) {
            // don't bother type checking items inside the array, just pass null for the base type
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(new TArray(null), expectedType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        // no items, can't infer type, assume expected type is correct
        if (!this.items.length) {
            if (!expectedType.baseType) return this.type = new TArray(new TAny());
            return this.type = expectedType;
        }
        if (expectedType.baseType) {
            // check assignability for each item in the array
            for (const i in this.items) {
                const t = i.resolveType(typeChecker, module.symbolTable, expectedType.baseType);
                // TODO you were here
            }
        }
        // infer the type of the first item
        let baseType = this.items[0].resolveType(typeChecker, module, symbolTable, expectedType);
        // for all remaining items, make sure there is one base assignable type for them all
        for (let i = 1; i < this.items.length; ++i) {
            const type = this.items[i].resolveType(typeChecker, module);
            if (baseType.isAssignableTo(type) && !type.isAssignableTo(baseType)) {
                // if there is an assignability relationship but type is more general than baseType, use type
                baseType = type;
            } else if (!baseType.isAssignableTo(type) && !type.isAssignableTo(baseType)) {
                // no assignability relationship, the only type we can use is any. TODO: this shouldn't be the way
                baseType = new TAny();
                break;
            }
        }
        return new TArray(baseType);
    }
}

export class TupleLiteral extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }

    // TODO: how to relate this to isAssignableFrom()
    resolveType(typeChecker, module, symbolTable, expectedType) {
        if (!(expectedType instanceof TTuple)) {
            // don't bother type checking items inside the tuple, just pass null for each item
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(new TArray(this.items.map(i => null)), expectedType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        for (let i = 0; i < this.items.length; ++i) {
            const item = this.items[i];
            item.resolveType(typeChecker, module, symbolTable, expectedType.items[i]);
        }
        return this.type = expectedType;
    }
}

export class StructLiteral extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.entries = [];
        for (let i = 0; i < this.keyTokens.length; ++i) {
            node.entries.push({ key: this.keyTokens[i].image, value: this.values[i].reduce() });
            node.registerLocation(`key_${this.keyTokens[i].image}`, this.keyTokens[i].getLocation());
        }
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }

    // TODO: how to relate this to isAssignableFrom()
    resolveType(typeChecker, module) {
        const fields = {};
        for (const { key, value } of this.entries) {
            fields[key] = value.resolveType(typeChecker, module);
        }
        return new TStruct(fields);
    }
}

export class LambdaExpression extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.params = this.paramList.reduce();
        node.body = this.body.reduce();
        // lambda expression start location is complicated because it can either be a '(', a param type, or a param name
        node.createAndRegisterLocation('self',
            this.openParenToken ? this.openParenToken.getLocation() : this.params[0].type ? this.params[0].type.locations.self : this.params[0].locations.name,
            this.body.locations.self);
        return node;
    }

    resolveType(typeChecker, module) {
        const paramTypes = this.params.map(p => p.resolveType(typeChecker, module));
        // can't infer return type, that will happen when we are checking types
        return new TFunction(paramTypes, null);
    }
}

export class LambdaParamList extends ASTNode {
    reduce() {
        // semantically, this node is useless, just return the params list directly
        if (this.params.length === 1 && this.params[0].type === 'IDENT') {
            return [new LambdaParam({ identifierToken: this.params[0] }).reduce()];
        }
        return this.params.map(p => p.reduce());
    }
}

export class LambdaParam extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        if (this.type) node.type = this.type.reduce();
        node.name = this.identifierToken.image;
        node.registerLocation('name', this.identifierToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module) {
        // if the type isn't explicit, we can't infer it, that will happen during type checking
        return this.type ? this.type.resolveType(typeChecker, module) : null;
    }
}

export class UnaryExpression extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.prefix = this.prefix;
        node.oper = this.operatorToken.image;
        node.registerLocation('oper', this.operatorToken.getLocation());
        node.target = this.target.reduce();
        // start and end location depends on if it is a prefix or postfix operation
        node.createAndRegisterLocation('self', node.prefix ? node.locations.oper : node.target.locations.self, node.prefix ? node.target.locations.self : node.locations.oper);
        return node;
    }

    resolveType(typeChecker, module) {
        const targetType = this.target.resolveType(typeChecker, module);
        return typeChecker.getOperatorReturnType(module, this.oper, targetType);
    }
}

export class BinaryExpression extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.oper = this.operatorToken.image;
        node.registerLocation('oper', this.operatorToken.getLocation());
        node.left = this.left.reduce();
        node.right = this.right.reduce();
        node.createAndRegisterLocation('self', node.left.locations.self, node.right.locations.self);
        return node;
    }

    resolveType(typeChecker, module) {
        const leftType = this.left.resolveType(typeChecker, module);
        const rightType = this.right.resolveType(typeChecker, module);
        return typeChecker.getOperatorReturnType(module, this.oper, leftType, rightType);
    }
}

export class IfElseExpression extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.condition = this.condition.reduce();
        node.consequent = this.consequent.reduce();
        node.alternate = this.alternate.reduce();
        node.createAndRegisterLocation('self', this.ifToken.getLocation(), node.alternate.locations.self);
        return node;
    }

    resolveType(typeChecker, module) {
        let type = this.consequent.resolveType(typeChecker, module);
        if (type instanceof TUnknown) return new TUnknown();
        const altType = this.alternate.resolveType(typeChecker, module);
        if (altType instanceof TUnknown) return new TUnknown();
        if (type.isAssignableTo(altType) && !altType.isAssignableTo(type)) {
            // if there is an assignability relationship but altType is more general than type, use altType
            type = altType;
        } else if (!type.isAssignableTo(altType) && !altType.isAssignableTo(type)) {
            // no assignability relationship, the only type we can use is any. TODO: this shouldn't be the way
            type = new TAny();
        }
        return type;
    }
}

export class VarDeclaration extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.name = this.varIdentToken.image;
        node.registerLocation('name', this.varIdentToken.getLocation());
        node.initExp = this.initialValue.reduce();
        node.createAndRegisterLocation('self', node.locations.name, node.initExp.locations.self);
        return node;
    }

    resolveType(typeChecker, module) {
        return this.initExp.resolveType(typeChecker, module);
    }
}

export class FunctionApplication extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.target = this.target.reduce();
        node.paramValues = this.paramValues.map(v => v.reduce());
        node.createAndRegisterLocation('self', node.target.locations.self, this.closeParenToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module) {
        const funcType = this.target.resolveType(typeChecker, module);
        // the type is not a function type so it cannot be inferred
        if (!(funcType instanceof TFunction)) return new TUnknown();
        return funcType.returnType;
    }
}

export class FieldAccess extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.target = this.target.reduce();
        node.field = this.fieldIdentToken.image;
        node.registerLocation('field', this.fieldIdentToken.getLocation());
        node.createAndRegisterLocation('self', node.target.locations.self, node.locations.field);
        return node;
    }

    resolveType(typeChecker, module) {
        const structType = this.target.resolveType(typeChecker, module);
        // type is not a struct type so it can't be inferred
        if (!(structType instanceof TStruct)) return new TUnknown();
        return structType.fields[this.field];
    }
}

export class ArrayAccess extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.target = this.target.reduce();
        node.indexExp = this.indexExp.reduce();
        node.createAndRegisterLocation('self', node.target.locations.self, this.closeBracketToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module) {
        const arrayType = this.target.resolveType(typeChecker, module);
        // type is not an array type so it can't be inferred
        if (!(arrayType instanceof TArray)) return new TUnknown();
        return arrayType.baseType;
    }
}
