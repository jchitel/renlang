import ASTNode from './ASTNode';
import { TInteger, TFloat, TChar, TBool, TArray, TTuple, TStruct, TFunction, TUnknown, TAny, determineGeneralType } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';
import { getOperator } from '../runtime/operators';


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
        return this.type = new TFunction(paramTypes, null);
    }

    /**
     * Once the type of the lambda has been inferred and filled in,
     * we need to do resolution on the body.
     */
    completeResolution(typeChecker, module) {
        // create a symbol table initialized to contain the parameters
        const symbolTable = {};
        for (let i = 0; i < this.params.length; ++i) {
            symbolTable[this.params[i].name] = this.type.paramTypes[i];
        }
        // type check the function body, passing along the starting symbol table
        const actualReturnType = this.body.resolveType(typeChecker, module, symbolTable);
        if (!this.returnType.isAssignableFrom(actualReturnType)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(actualReturnType, this.returnType), module.path, this.locations.self));
        }
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

    resolveType(typeChecker, module, symbolTable) {
        const targetType = this.target.resolveType(typeChecker, module, symbolTable);
        // check if the operator exists
        const oper = getOperator(this.oper, this.prefix ? 'prefix' : 'suffix');
        if (!oper) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_DEFINED(this.oper), module.path, this.locations.oper));
            return this.type = new TUnknown();
        }
        // resolve the function type of the operator using the type being passed to it
        this.operType = oper.getType(targetType);
        if (this.operType instanceof TUnknown) {
            typeChecker.errors.push(new TypeCheckError(mess.INVALID_OPERATOR(this.oper, targetType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        // the return type of the operator type is the type of this expression
        return this.type = this.operType.returnType;
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

    selectAssociativity(a, b) {
        // default to ours, if the other is none or equal, this won't change, if ours is none and the other isn't, use the other, otherwise use left
        let ass = a.associativity === 'none' ? (b.associativity === 'none' ? 'left' : b.associativity) : a.associativity;
        if (a.associativity === 'left' && b.associativity === 'right' || a.associativity === 'right' && b.associativity === 'left') {
            // conflicting associativity, impossible to resolve precedence
            typeChecker.errors.push(new TypeCheckError(mess.CONFLICTING_ASSOCIATIVITY(a.symbol, b.symbol), module.path, this.locations.self));
            return;
        }
        return ass;
    }

    /**
     * Shift the expression tree so that this node is moved to the current right node's left child,
     * and the right node's left child becomes this node's right child
     */
    shiftRightUp() {
        // clone this node, overwriting the right node with the current right node's left node
        const clone = Object.assign(this._createNewNode(), { oper: this.oper, left: this.left, right: this.right.left, locations: this.locations });
        // copy the fields of the right node onto this, overwriting the left node with this new clone
        Object.assign(this, { oper: this.right.oper, left: clone, right: this.right.right, locations: this.right.locations });
    }

    /**
     * Shift the expression tree so that this node is moved to the current left node's right child,
     * and the left node's right child becomes this node's left child
     */
    shiftLeftUp() {
        // clone this node, overwriting the left node with the current left node's right node
        const clone = Object.assign(this._createNewNode(), { oper: this.oper, left: this.left.right, right: this.right, locations: this.locations });
        // copy the fields of the left node onto this, overwriting the right node with this new clone
        Object.assign(this, { oper: this.left.oper, left: this.left.left, right: clone, locations: this.left.locations });
    }

    /**
     * Resolve the precedence of this binary operator if it has children that are also binary operators.
     * This is a complicated bit of logic that is based on two rules:
     * - operators with higher precedence get pushed down in the tree
     * - operators with the same precedence get pushed left for left associativity and right for right associativity
     * This is attempted by starting at the top node of a tree of binary expressions,
     * which will initially be a fully left-associative structure, where the full chain
     * of operators goes down to the left.
     * We then traverse the tree, shifting it according to the above rules, until it has been completely resolved.
     * TODO: this REALLY needs to be tested, I have no idea if this is going to work.
     */
    resolvePrecedence(typeChecker, module) {
        const oper = getOperator(this.oper, 'infix');
        if (this.right instanceof BinaryExpression) {
            const rightOper = getOperator(this.right.oper, 'infix');
            if (rightOper.precedence < oper.precedence) {
                this.shiftRightUp();
            } else if (rightOper.precedence == oper.precedence) {
                const ass = this.selectAssociativity(oper, rightOper);
                if (ass === 'left') this.shiftRightUp();
            }
        }
        // continue to iterate until we don't need to switch the tree
        while (this.left instanceof BinaryExpression) {
            const leftOper = getOperator(this.left.oper, 'infix');
            if (leftOper.precedence < oper.precedence) {
                this.shiftLeftUp();
                // visit the new parent, which is actually now the current node
                this.resolvePrecedence(typeChecker, module);
                // finish visiting the original node, which is now the right child
                this.right.resolvePrecedence(typeChecker, module);
                continue;
            } else if (leftOper.precedence === oper.precedence) {
                const ass = this.selectAssociativity(oper, leftOper);
                if (ass === 'right') {
                    this.shiftLeftUp();
                    // visit the new parent, which is actually now the current node
                    this.resolvePrecedence(typeChecker, module);
                    // finish visiting the original node, which is now the right child
                    this.right.resolvePrecedence(typeChecker, module);
                    continue;
                }
            }
            // the tree is structured validly, stop looping
            break;
        }
    }

    resolveType(typeChecker, module, symbolTable) {
        // resolve the expression based on precedence rules, may mutate tree
        this.resolvePrecedence(typeChecker, module);
        // resolve the left and right expression types
        const leftType = this.left.resolveType(typeChecker, module, symbolTable);
        const rightType = this.right.resolveType(typeChecker, module, symbolTable);
        // check if the operator exists
        const oper = getOperator(this.oper, 'infix');
        if (!oper) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_DEFINED(this.oper), module.path, this.locations.oper));
            return this.type = new TUnknown();
        }
        // resolve the function type of the operator using the types being passed to it
        this.operType = oper.getType(leftType, rightType);
        if (this.operType instanceof TUnknown) {
            typeChecker.errors.push(new TypeCheckError(mess.INVALID_OPERATOR(this.oper, targetType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        // the return type of the operator type is the type of this expression
        return this.type = this.operType.returnType;
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
        if (symbolTable[this.name] || module.getValueType(this.name)) {
            // symbol already exists
            typeChecker.errors.push(new TypeCheckError(mess.NAME_CLASH(this.name), module.path, this.locations.name));
        } else {
            // add the variable to the symbol table
            symbolTable[this.name] = expType;
        }
        return this.type = expType;
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

    resolveType(typeChecker, module, symbolTable) {
        const funcType = this.target.resolveType(typeChecker, module, symbolTable);
        if (funcType instanceof TUnknown) return this.type = new TUnknown();
        // the type is not a function type so it cannot be inferred
        if (!(funcType instanceof TFunction)) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_INVOKABLE, module.path, this.target.locations.self));
            return this.type = new TUnknown();
        }
        // resolve parameters
        for (let i = 0; i < this.paramValues.length; ++i) {
            const paramType = this.paramValues[i].resolveType(typeChecker, module, symbolTable);
            // skip arguments that have already been errored
            if (paramType instanceof TUnknown) continue;
            // resolve passed value against parameter type
            if (!funcType.paramTypes[i].isAssignableFrom(paramType)) {
                typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(paramType, funcType.paramTypes[i]), module.path, this.paramValues[i].locations.self));
                continue;
            }
            if (this.paramValues[i] instanceof LambdaExpression) {
                // function application is the only place that lambdas can be passed (for now), so we need to complete the resolution of the type and the lambda body
                paramType.completeResolution(funcType.paramTypes[i]);
                this.paramValues[i].completeResolution(typeChecker, module);
            }
        }
        // resulting expression type is the return type of the function type
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

    resolveType(typeChecker, module, symbolTable) {
        const structType = this.target.resolveType(typeChecker, module, symbolTable);
        if (structType instanceof TUnknown) return this.type = new TUnknown();
        // type is not a struct type so it can't be inferred
        if (!(structType instanceof TStruct)) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_STRUCT, module.path, this.target.locations.self));
            return this.type = new TUnknown();
        }
        // verify that the field exists
        if (!structType.fields[this.field]) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_DEFINED(this.field), module.path, this.locations.field));
            return this.type = new TUnknown();
        }
        // return the type of the field
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

    resolveType(typeChecker, module, symbolTable) {
        const arrayType = this.target.resolveType(typeChecker, module, symbolTable);
        if (arrayType instanceof TUnknown) return this.type = new TUnknown();
        // type is not an array type so it can't be inferred
        if (!(arrayType instanceof TArray)) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_ARRAY, module.path, this.target.locations.self));
            return this.type = new TUnknown();
        }
        // verify that the index expression is an integer
        const indexExpType = this.indexExp.resolveType(typeChecker, module, symbolTable);
        if (!(indexExpType instanceof TUnknown) && !(indexExpType instanceof TInteger)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(indexExpType, new TInteger(null, null)), module.path, this.indexExp.locations.self));
        }
        // type is the base type of the array
        return this.type = arrayType.baseType;
    }
}
