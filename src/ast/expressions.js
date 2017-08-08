import ASTNode from './ASTNode';
import { TInteger, TFloat, TChar, TBool, TArray, TTuple, TStruct, TFunction, TUnknown, TAny, determineGeneralType } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';


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

    resolveType(typeChecker, module, symbolTable) {
        return this.type = this.parenthesized.resolveType(typeChecker, module, symbolTable);
    }
}

export class IntegerLiteral extends ASTNode {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    resolveType() {
        return this.estimateType();
    }

    estimateType() {
        let signed, size;
        if (this.value < 0) {
            signed = true;
            if ((-this.value) < (2 ** 7)) size = 8;
            else if ((-this.value) < (2 ** 15)) size = 16;
            else if ((-this.value) < (2 ** 31)) size = 32;
            else if (this.value > -(2 ** 63)) size = 64; // TODO: not sure this is possible to calculate this way
            else size = Infinity;
        } else {
            signed = false;
            if (this.value < (2 ** 8)) size = 8;
            else if (this.value < (2 ** 16)) size = 16;
            else if (this.value < (2 ** 32)) size = 32;
            else if (this.value < (2 ** 64)) size = 64; // TODO: not sure this is possible to calculate this way
            else size = Infinity;
        }
        return this.type = new TInteger(size, signed);
    }
}

export class FloatLiteral extends ASTNode {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    resolveType() {
        return this.estimateType();
    }

    estimateType() {
        return this.type = new TFloat(64); // TODO: add this logic
    }
}

export class CharLiteral extends ASTNode {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    resolveType() {
        return this.type = new TChar();
    }
}

export class StringLiteral extends ASTNode {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    resolveType() {
        return this.type = new TArray(new TChar());
    }
}

export class BoolLiteral extends ASTNode {
    constructor(image, location) {
        super({ value: image === 'true' });
        this.registerLocation('self', location);
    }

    resolveType() {
        return this.type = new TBool();
    }
}

export class IdentifierExpression extends ASTNode {
    constructor(name, location) {
        super({ name });
        this.registerLocation('self', location);
    }

    resolveType(typeChecker, module, symbolTable) {
        let actualType = symbolTable[this.name];
        if (!actualType) {
            actualType = typeChecker.getValueType(module, this.name);
        }
        if (!actualType) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_DEFINED(this.name), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        return this.type = actualType;
    }
}

export class ArrayLiteral extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openBracketToken.getLocation(), this.closeBracketToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // infer the type of the first item
        let baseType = this.items[0].resolveType(typeChecker, module, symbolTable);
        // for all remaining items, make sure there is one base assignable type for them all
        for (let i = 1; i < this.items.length; ++i) {
            const type = this.items[i].resolveType(typeChecker, module);
            baseType = determineGeneralType(baseType, type);
        }
        return this.type = new TArray(baseType);
    }
}

export class TupleLiteral extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        const itemTypes = [];
        for (const item of this.items) {
            itemTypes.push(item.resolveType(typeChecker, module, symbolTable));
        }
        return this.type = new TTuple(itemTypes);
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

    resolveType(typeChecker, module, symbolTable) {
        const fields = {};
        for (const { key, value } of this.entries) {
            fields[key] = value.resolveType(typeChecker, module, symbolTable);
        }
        return this.type = new TStruct(fields);
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

    resolveType(typeChecker, module, symbolTable) {
        const paramTypes = this.params.map(p => p.resolveType(typeChecker, module, symbolTable));
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
        if (this.type) node.typeNode = this.type.reduce();
        node.name = this.identifierToken.image;
        node.registerLocation('name', this.identifierToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // if the type isn't explicit, we can't infer it, that will happen during type checking
        return this.type = (this.typeNode ? this.typeNode.resolveType(typeChecker, module, symbolTable) : null);
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

    // TODO: factor in lambda types
    resolveType(typeChecker, module, symbolTable) {
        const targetType = this.target.resolveType(typeChecker, module, symbolTable);
        return this.type = typeChecker.getOperatorReturnType(module, this.oper, targetType);
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

    // TODO: factor in lambda types
    resolveType(typeChecker, module, symbolTable) {
        const leftType = this.left.resolveType(typeChecker, module, symbolTable);
        const rightType = this.right.resolveType(typeChecker, module, symbolTable);
        return this.type = typeChecker.getOperatorReturnType(module, this.oper, leftType, rightType);
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

    resolveType(typeChecker, module, symbolTable) {
        const conditionType = this.condition.resolveType(typeChecker, module, symbolTable);
        if (!(new TBool().isAssignableFrom(conditionType))) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(conditionType, new TBool()), module.path, this.condition.locations.self));
        }
        const type = this.consequent.resolveType(typeChecker, module, symbolTable);
        const altType = this.alternate.resolveType(typeChecker, module, symbolTable);
        return this.type = determineGeneralType(type, altType);
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

    resolveType(typeChecker, module, symbolTable) {
        const expType = this.initExp.resolveType(typeChecker, module, symbolTable);
        symbolTable[this.name] = expType;
        return expType;
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

    // TODO: factor in lambda types
    resolveType(typeChecker, module) {
        const funcType = this.target.resolveType(typeChecker, module);
        // the type is not a function type so it cannot be inferred
        if (!(funcType instanceof TFunction)) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_INVOKABLE, module.path, this.target.locations.self));
            return this.type = new TUnknown();
        }
        for (let i = 0; i < this.paramValues.length; ++i) {
            // TODO you were here
        }
        return this.type = funcType.returnType;
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
