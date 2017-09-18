import ASTNode from './ASTNode';
import { TInteger, TFloat, TChar, TBool, TArray, TTuple, TStruct, TFunction, TUnknown, TAny, determineGeneralType } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';
import { getOperator, createOperator, verifyMultiOperator } from '../runtime/operators';
import {
    SetIntegerRef,
    SetFloatRef,
    SetCharRef,
    SetBoolRef,
    SetArrayRef,
    SetTupleRef,
    SetStructRef,
    UnaryOperatorRef,
    BinaryOperatorRef,
    FalseBranch,
    Jump,
    Noop,
    AddToScope,
    FunctionCallRef,
    FieldAccessRef,
    ArrayAccessRef,
    CopyRef,
} from '../runtime/instructions';


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
            return new IdentifierExpression(this.identToken.image, this.identToken.getLocation());
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
        } else if (this.parenthesized) {
            return this.parenthesized.reduce();
        } else {
            throw new Error('Invalid Expression node');
        }
    }

    resolveType(typeChecker, module, symbolTable) {
        return this.type = this.parenthesized.resolveType(typeChecker, module, symbolTable);
    }

    translate(translator, func) {
        return this.parenthesized.translate(translator, func);
    }
}

export class ParenthesizedExpression extends Expression {
    reduce() {
        const node = this._createNewNode();
        node.inner = this.inner.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}

export class IntegerLiteral extends Expression {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    reduce() {
        return this;
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

    translate(translator, func) {
        return func.addRefInstruction(translator, ref => new SetIntegerRef(ref, this.value));
    }
}

export class FloatLiteral extends Expression {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    reduce() {
        return this;
    }

    resolveType() {
        return this.estimateType();
    }

    estimateType() {
        return this.type = new TFloat(64); // TODO: add this logic
    }

    translate(translator, func) {
        return func.addRefInstruction(translator, ref => new SetFloatRef(ref, this.value));
    }
}

export class CharLiteral extends Expression {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    reduce() {
        return this;
    }

    resolveType() {
        return this.type = new TChar();
    }

    translate(translator, func) {
        return func.addRefInstruction(translator, ref => new SetCharRef(ref, this.value));
    }
}

export class StringLiteral extends Expression {
    constructor(value, location) {
        super({ value });
        this.registerLocation('self', location);
    }

    reduce() {
        return this;
    }

    resolveType() {
        return this.type = new TArray(new TChar());
    }

    translate(translator, func) {
        return func.addRefInstruction(translator, ref => new SetArrayRef(ref, this.value));
    }
}

export class BoolLiteral extends Expression {
    constructor(image, location) {
        super({ value: image === 'true' });
        this.registerLocation('self', location);
    }

    reduce() {
        return this;
    }

    resolveType() {
        return this.type = new TBool();
    }

    translate(translator, func) {
        return func.addRefInstruction(translator, ref => new SetBoolRef(ref, this.value));
    }
}

export class IdentifierExpression extends Expression {
    constructor(name, location) {
        super({ name });
        this.registerLocation('self', location);
    }

    reduce() {
        return this;
    }

    resolveType(typeChecker, module, symbolTable) {
        let actualType = symbolTable[this.name];
        if (!actualType) {
            actualType = typeChecker.getValueType(module, this.name);
        }
        if (!actualType) {
            typeChecker.errors.push(new TypeCheckError(mess.VALUE_NOT_DEFINED(this.name), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        return this.type = actualType;
    }

    translate(translator, func) {
        // check to see if the name matches a variable in the current scope
        if (func.getFromScope(this.name) !== undefined) return func.getFromScope(this.name);
        // otherwise we need the translator to resolve a module-scope reference
        return func.addRefInstruction(translator, ref => translator.referenceIdentifier(ref, this.name, func.moduleId));
    }
}

export class ArrayLiteral extends Expression {
    reduce() {
        const node = this._createNewNode();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openBracketToken.getLocation(), this.closeBracketToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // for all items, make sure there is one base assignable type for them all
        let baseType = null;
        for (const item of this.items) {
            const type = item.resolveType(typeChecker, module, symbolTable);
            baseType = determineGeneralType(baseType, type);
        }
        if (!baseType) baseType = new TAny();
        return this.type = new TArray(baseType);
    }

    translate(translator, func) {
        const refs = [];
        for (const item of this.items) {
            refs.push(item.translate(translator, func));
        }
        return func.addRefInstruction(translator, ref => new SetArrayRef(ref, refs));
    }
}

export class TupleLiteral extends Expression {
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

    translate(translator, func) {
        const refs = [];
        for (const item of this.items) {
            refs.push(item.translate(translator, func));
        }
        return func.addRefInstruction(translator, ref => new SetTupleRef(ref, refs));
    }
}

export class StructLiteral extends Expression {
    reduce() {
        const node = this._createNewNode();
        node.entries = [];
        for (const entry of this.entries) {
            const { key, value, loc } = entry.reduce();
            node.entries.push({ key, value });
            node.registerLocation(`key_${key}`, loc);
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

    translate(translator, func) {
        const refs = {};
        for (const { key, value } of this.entries) {
            refs[key] = value.translate(translator, func);
        }
        return func.addRefInstruction(translator, ref => new SetStructRef(ref, refs));
    }
}

export class StructEntry extends ASTNode {
    reduce() {
        return { key: this.keyToken.image, value: this.value.reduce(), loc: this.keyToken.getLocation() };
    }
}

export class LambdaExpression extends Expression {
    reduce() {
        const node = this._createNewNode();
        if (this.shorthandParam) node.params = [new LambdaParam({ identToken: this.shorthandParam }).reduce()];
        else node.params = this.params.map(p => p.reduce());
        node.body = this.functionBody.reduce();
        // lambda expression start location is complicated because it can either be a '(' or a param name
        node.createAndRegisterLocation('self',
            this.openParenToken ? this.openParenToken.getLocation() : node.params[0].locations.name,
            node.body.locations.self);
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
        if (!this.type.returnType.isAssignableFrom(actualReturnType)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(actualReturnType, this.type.returnType), module.path, this.locations.self));
        }
    }

    translate(translator, func) {
        return func.addRefInstruction(translator, ref => translator.lambda(this, ref));
    }
}

export class LambdaParam extends ASTNode {
    reduce() {
        if (this.typedParam) return this.typedParam.reduce();
        const node = this._createNewNode();
        node.name = this.identToken.image;
        node.registerLocation('name', this.identToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // if the type isn't explicit, we can't infer it, that will happen during type checking
        return this.type = (this.typeNode ? this.typeNode.resolveType(typeChecker, module, symbolTable) : null);
    }
}

export class UnaryExpression extends Expression {
    reduce() {
        // verify that any multiple operator tokens are valid
        this.operatorToken = verifyMultiOperator(this.operatorToken);
        const node = this._createNewNode();
        node.oper = this.operatorToken.image;
        node.registerLocation('oper', this.operatorToken.getLocation());
        node.target = this.target.reduce();
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        const targetType = this.target.resolveType(typeChecker, module, symbolTable);
        // check if the operator exists
        const oper = getOperator(this.oper, this.prefix ? 'prefix' : 'postfix');
        if (!oper) {
            typeChecker.errors.push(new TypeCheckError(mess.VALUE_NOT_DEFINED(this.oper), module.path, this.locations.oper));
            return this.type = new TUnknown();
        }
        // resolve the function type of the operator using the type being passed to it
        this.operType = new oper().getType(targetType);
        if (this.operType instanceof TUnknown) {
            typeChecker.errors.push(new TypeCheckError(mess.INVALID_UNARY_OPERATOR(this.oper, targetType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        // the return type of the operator type is the type of this expression
        return this.type = this.operType.returnType;
    }

    translate(translator, func) {
        const targetRef = this.target.translate(translator, func);
        return func.addRefInstruction(translator, ref => new UnaryOperatorRef(ref, this.oper, targetRef, this.prefix));
    }
}

export class PrefixExpression extends UnaryExpression {
    reduce() {
        const node = super.reduce();
        node.createAndRegisterLocation('self', node.locations.oper, node.target.locations.self);
        return node;
    }
}

export class PostfixExpression extends UnaryExpression {
    reduce() {
        const node = super.reduce();
        node.createAndRegisterLocation('self', node.target.locations.self, node.locations.oper);
        return node;
    }
}

export class BinaryExpression extends Expression {
    reduce() {
        // handle < and > problems
        this.operatorToken = verifyMultiOperator(this.operatorToken); // TODO: remove brackets
        // convert the current binary expression tree to a list
        const items = this.toList();
        // Shunting-yard algorithm to resolve precedence
        const expStack = [];
        const operStack = [];
        while (items.length) {
            const item = items.shift();
            if (item instanceof Expression) {
                expStack.push(item);
            } else {
                while (operStack.length && this.shouldPopOperator(item, operStack[operStack.length - 1])) {
                    const right = expStack.pop();
                    const left = expStack.pop();
                    const oper = operStack.pop();
                    const exp = new BinaryExpression({ left, oper: oper.image, right });
                    exp.registerLocation('oper', oper.getLocation());
                    exp.createAndRegisterLocation('self', left.locations.self, right.locations.self);
                    expStack.push(exp);
                }
                operStack.push(item);
            }
        }
        // empty the operator stack
        while (operStack.length) {
            const right = expStack.pop();
            const left = expStack.pop();
            const oper = operStack.pop();
            const exp = new BinaryExpression({ left, oper: oper.image, right });
            exp.registerLocation('oper', oper.getLocation());
            exp.createAndRegisterLocation('self', left.locations.self, right.locations.self);
            expStack.push(exp);
        }
        // final expression tree is the only element left on the exp stack
        return expStack[0];
    }

    toList() {
        const items = [];
        // the tree is left-associative, so we assemble the list from right to left
        let right = this.right.reduce();
        let operToken = this.operatorToken;
        // if the left is binary, don't reduce it because that's what we're doing
        let left = this.left.binary ? this.left.binary : this.left.reduce();
        while (true) {
            items.unshift(right);
            items.unshift(operToken);
            if (left instanceof BinaryExpression) {
                right = left.right.reduce();
                operToken = left.operatorToken;
                left = left.left.binary ? left.left.binary : left.left.reduce();
            } else {
                items.unshift(left);
                break;
            }
        }
        return items;
    }

    shouldPopOperator(nextToken, stackToken) {
        const nextOper = createOperator(nextToken.image, 'infix');
        const stackOper = createOperator(stackToken.image, 'infix');
        return stackOper.precedence >= nextOper.precedence && ['left', 'none'].includes(stackOper.associativity);
    }

    resolveType(typeChecker, module, symbolTable) {
        // resolve the left and right expression types
        const leftType = this.left.resolveType(typeChecker, module, symbolTable);
        const rightType = this.right.resolveType(typeChecker, module, symbolTable);
        // check if the operator exists
        const oper = getOperator(this.oper, 'infix');
        if (!oper) {
            typeChecker.errors.push(new TypeCheckError(mess.VALUE_NOT_DEFINED(this.oper), module.path, this.locations.oper));
            return this.type = new TUnknown();
        }
        // resolve the function type of the operator using the types being passed to it
        this.operType = new oper().getType(leftType, rightType);
        if (this.operType instanceof TUnknown) {
            typeChecker.errors.push(new TypeCheckError(mess.INVALID_BINARY_OPERATOR(this.oper, leftType, rightType), module.path, this.locations.self));
            return this.type = new TUnknown();
        }
        // the return type of the operator type is the type of this expression
        return this.type = this.operType.returnType;
    }

    translate(translator, func) {
        const leftRef = this.left.translate(translator, func);
        const rightRef = this.right.translate(translator, func);
        return func.addRefInstruction(translator, ref => new BinaryOperatorRef(ref, leftRef, this.oper, rightRef));
    }
}

export class IfElseExpression extends Expression {
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

    translate(translator, func) {
        // get new reference id for result of expression
        const ref = translator.newReference();
        // if condition
        const conditionRef = this.condition.translate(translator, func);
        const branch = func.addInstruction(new FalseBranch(conditionRef));
        // evaluate consequent, copy into result, jump
        const csqRef = this.consequent.translate(translator, func);
        func.addInstruction(new CopyRef(csqRef, ref));
        const jump = func.addInstruction(new Jump());
        // evaluate alternate, copy into result
        branch.target = func.nextInstrNum();
        const altRef = this.alternate.translate(translator, func);
        func.addInstruction(new CopyRef(altRef, ref));
        jump.target = func.nextInstrNum();
        func.addInstruction(new Noop());
        // return result reference
        return ref;
    }
}

export class VarDeclaration extends Expression {
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
        if (symbolTable[this.name] || typeChecker.getValueType(this.name)) {
            // symbol already exists
            typeChecker.errors.push(new TypeCheckError(mess.NAME_CLASH(this.name), module.path, this.locations.name));
        } else {
            // add the variable to the symbol table
            symbolTable[this.name] = expType;
        }
        return this.type = expType;
    }

    translate(translator, func) {
        const initRef = this.initExp.translate(translator, func);
        func.addToScope(this.name, initRef, new AddToScope(this.name, initRef));
        return initRef;
    }
}

export class FunctionApplication extends Expression {
    reduce() {
        const node = this._createNewNode();
        node.target = this.target.reduce();
        if (this.typeArgList) node.typeArgs = this.typeArgList.reduce();
        node.args = this.args.map(v => v.reduce());
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
        // resolve parameters TODO handle type parameters
        for (let i = 0; i < this.args.length; ++i) {
            const paramType = this.args[i].resolveType(typeChecker, module, symbolTable);
            // skip arguments that have already been errored
            if (paramType instanceof TUnknown) continue;
            // resolve passed value against parameter type
            if (!funcType.paramTypes[i].isAssignableFrom(paramType)) {
                typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(paramType, funcType.paramTypes[i]), module.path, this.args[i].locations.self));
                continue;
            }
            if (this.args[i] instanceof LambdaExpression) {
                // function application is the only place that lambdas can be passed (for now), so we need to complete the resolution of the type and the lambda body
                paramType.completeResolution(funcType.paramTypes[i]);
                this.args[i].completeResolution(typeChecker, module);
            }
        }
        // resulting expression type is the return type of the function type
        return this.type = funcType.returnType;
    }

    translate(translator, func) {
        const targetRef = this.target.translate(translator, func);
        const argRefs = this.args.map(p => p.translate(translator, func));
        return func.addRefInstruction(translator, ref => new FunctionCallRef(ref, targetRef, argRefs));
    }
}

export class FieldAccess extends Expression {
    reduce() {
        const node = this._createNewNode();
        node.target = this.target.reduce();
        node.field = this.fieldNameToken.image;
        node.registerLocation('field', this.fieldNameToken.getLocation());
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
            typeChecker.errors.push(new TypeCheckError(mess.VALUE_NOT_DEFINED(this.field), module.path, this.locations.field));
            return this.type = new TUnknown();
        }
        // return the type of the field
        return structType.fields[this.field];
    }

    translate(translator, func) {
        const targetRef = this.target.translate(translator, func);
        return func.addRefInstruction(translator, ref => new FieldAccessRef(ref, targetRef, this.field));
    }
}

export class ArrayAccess extends Expression {
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

    translate(translator, func) {
        const targetRef = this.target.translate(translator, func);
        const indexRef = this.indexExp.translate(translator, func);
        return func.addRefInstruction(translator, ref => new ArrayAccessRef(ref, targetRef, indexRef));
    }
}
