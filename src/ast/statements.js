import ASTNode from './ASTNode';
import { TBool, TTuple, TArray, TUnknown, determineGeneralType } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';
import { Expression } from './expressions';


export class Statement extends ASTNode {
    reduce() {
        if (this.block) {
            return this.block.reduce();
        } else if (this.exp) {
            return this.exp.reduce();
        } else if (this.for) {
            return this.for.reduce();
        } else if (this.while) {
            return this.while.reduce();
        } else if (this.doWhile) {
            return this.doWhile.reduce();
        } else if (this.tryCatch) {
            return this.tryCatch.reduce();
        } else if (this.throw) {
            return this.throw.reduce();
        } else if (this.return) {
            return this.return.reduce();
        } else if (this.break) {
            return this.break.reduce();
        } else if (this.continue) {
            return this.continue.reduce();
        } else {
            throw new Error('Invalid Statement node');
        }
    }
}

export class Block extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        // filter out noops, because noops inside blocks mean nothing
        node.statements = this.statements.map(s => s.reduce()).filter(s => !(s instanceof Noop));
        // once all noops have been removed, if this is now empty, return a noop
        if (!node.statements.length) return new Noop(this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        let returnType = null;
        for (const statement of this.statements) {
            if (statement instanceof Expression) {
                // types of expression statements are not used in blocks
                statement.resolveType(typeChecker, module, symbolTable);
            } else {
                // statements may have return types (if they are return statements or contain return statements)
                const type = statement.resolveType(typeChecker, module, symbolTable);
                returnType = determineGeneralType(returnType, type);
            }
        }
        return returnType;
    }
}

/**
 * Represents a statement that does nothing, representable in code by {}.
 * Inside another block, this is effectively nothing, but this has semantic meaning as a function body or statement body.
 */
export class Noop extends ASTNode {
    constructor(startLoc, endLoc) {
        super({});
        this.createAndRegisterLocation('self', startLoc, endLoc);
    }

    // noop, nothing to check
    resolveType() {}
}

export class ForStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.iterVar = this.iterVar.image;
        node.registerLocation('iterVar', this.iterVar.getLocation());
        node.iterableExp = this.iterableExp.reduce();
        node.body = this.body.reduce();
        node.createAndRegisterLocation('self', this.forToken.getLocation(), node.body.locations.self);
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // type check the iterable expression, will fill in the base type of the array
        const arrayType = this.iterableExp.resolveType(typeChecker, module, symbolTable);
        let iterType;
        if (!(new TArray(null).isAssignableFrom(arrayType))) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(arrayType, new TArray(null)), module.path, this.iterableExp.locations.self));
            iterType = new TUnknown();
        } else {
            iterType = arrayType.baseType;
        }
        // add the iterator variable to the symbol table, visit the body, then remove it
        symbolTable[this.iterVar] = iterType;
        // add the loop number as a special symbol
        symbolTable['@@loopNumber'] = symbolTable['@@loopNumber'] ? (symbolTable['@@loopNumber'] + 1) : 0;
        const returnType = this.body.resolveType(typeChecker, module, symbolTable);
        delete symbolTable[this.iterVar];
        symbolTable['@@loopNumber']--;
        return returnType;
    }
}

export class WhileStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.conditionExp = this.conditionExp.reduce();
        node.body = this.body.reduce();
        node.createAndRegisterLocation('self', this.whileToken.getLocation(), node.body.locations.self);
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // type check the condition
        const conditionType = this.conditionExp.resolveType(typeChecker, module, symbolTable);
        if (!(new TBool().isAssignableFrom(conditionType))) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(conditionType, new TBool()), module.path, this.conditionExp.locations.self));
        }
        // add the loop number as a special symbol
        symbolTable['@@loopNumber'] = symbolTable['@@loopNumber'] ? (symbolTable['@@loopNumber'] + 1) : 0;
        // type check the body
        const returnType = this.body.resolveType(typeChecker, module, symbolTable);
        symbolTable['@@loopNumber']--;
        return returnType;
    }
}

export class DoWhileStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.body = this.body.reduce();
        node.conditionExp = this.conditionExp.reduce();
        node.createAndRegisterLocation('self', this.doToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // add the loop number as a special symbol
        symbolTable['@@loopNumber'] = symbolTable['@@loopNumber'] ? (symbolTable['@@loopNumber'] + 1) : 0;
        // type check the body
        const returnType = this.body.resolveType(typeChecker, module, symbolTable);
        symbolTable['@@loopNumber']--;
        // type check the condition
        const conditionType = this.conditionExp.resolveType(typeChecker, module, symbolTable);
        if (!(new TBool().isAssignableFrom(conditionType))) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(conditionType, new TBool()), module.path, this.conditionExp.locations.self));
        }
        return returnType;
    }
}

export class TryCatchStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.try = this.tryBody.reduce();
        node.catches = [];
        for (let i = 0; i < this.catchParams.length; ++i) {
            node.catches.push({ param: this.catchParams[i].reduce(), body: this.catchBlocks[i].reduce() });
        }
        if (this.finallyBlock) node.finally = this.finallyBlock.reduce();
        node.createAndRegisterLocation('self', this.tryToken.getLocation(), node.finally ? node.finally.locations.self : node.catches[node.catches.length - 1].body.locations.self);
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // type check the try
        let returnType = this.try.resolveType(typeChecker, module, symbolTable);
        // type check each try
        for (const cat of this.catches) {
            // add the param to the symbol table, type check the catch, remove it
            symbolTable[cat.param.name] = cat.param.type.resolveType(typeChecker, module);
            const returnType1 = cat.body.resolveType(typeChecker, module, symbolTable);
            returnType = determineGeneralType(returnType, returnType1);
            delete symbolTable[cat.param.name];
        }
        if (!this.finally) return returnType;
        // type check the finally
        const returnType1 = this.finally.resolveType(typeChecker, module, symbolTable);
        return determineGeneralType(returnType, returnType1);
    }
}

export class ThrowStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.exp = this.exp.reduce();
        node.createAndRegisterLocation('self', this.throwToken.getLocation(), node.exp.locations.self);
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // type check the expression, it can be anything so we don't have to do anything with the result
        this.exp.resolveType(typeChecker, module, symbolTable);
    }
}

export class ReturnStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        if (this.exp) {
            node.exp = this.exp.reduce();
            node.createAndRegisterLocation('self', this.returnToken.getLocation(), node.exp.locations.self);
        } else {
            node.registerLocation('self', this.returnToken.getLocation());
        }
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        // no return value, assumed to be ()
        if (!this.exp) return new TTuple([]);
        // otherwise check the return value
        return this.exp.resolveType(typeChecker, module, symbolTable);
    }
}

export class BreakStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.breakToken.getLocation(), this.loopNumber.getLocation());
        } else {
            node.loopNumber = 0;
            node.registerLocation('self', this.breakToken.getLocation());
        }
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        const loopNumber = symbolTable['@@loopNumber'];
        if (!('@@loopNumber' in symbolTable) || loopNumber < 0) {
            typeChecker.errors.push(new TypeCheckError(mess.INVALID_BREAK_STATEMENT, module.path, this.locations.self));
        } else if (this.loopNumber < 0 || this.loopNumber > loopNumber) {
            typeChecker.errors.push(new TypeCheckError(mess.INVALID_LOOP_NUM(this.loopNumber, loopNumber), module.path, this.locations.self));
        }
    }
}

export class ContinueStatement extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.continueToken.getLocation(), this.loopNumber.getLocation());
        } else {
            node.loopNumber = 0;
            node.registerLocation('self', this.continueToken.getLocation());
        }
        return node;
    }

    resolveType(typeChecker, module, symbolTable) {
        const loopNumber = symbolTable['@@loopNumber'];
        if (!('@@loopNumber' in symbolTable) || loopNumber < 0) {
            typeChecker.errors.push(new TypeCheckError(mess.INVALID_CONTINUE_STATEMENT, module.path, this.locations.self));
        } else if (this.loopNumber < 0 || this.loopNumber > loopNumber) {
            typeChecker.errors.push(new TypeCheckError(mess.INVALID_LOOP_NUM(this.loopNumber, loopNumber), module.path, this.locations.self));
        }
    }
}
