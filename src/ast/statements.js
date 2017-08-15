import ASTNode from './ASTNode';
import { TBool, TTuple, TArray, TUnknown, determineGeneralType } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';
import { Expression } from './expressions';
import { Noop as INoop, CreateReference, InteropReference, FalseBranch, AddToScope } from '../translator/instructions';


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

export class Block extends Statement {
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

    transform(translator, func) {
        for (const statement of this.statements) {
            statement.transform(translator, func);
        }
    }
}

/**
 * Represents a statement that does nothing, representable in code by {}.
 * Inside another block, this is effectively nothing, but this has semantic meaning as a function body or statement body.
 */
export class Noop extends Statement {
    constructor(startLoc, endLoc) {
        super({});
        this.createAndRegisterLocation('self', startLoc, endLoc);
    }

    // noop, nothing to check
    resolveType() {}

    transform(translator, func) {
        func.instructions.push(new INoop());
    }
}

export class ForStatement extends Statement {
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

    transform(translator, func) {
        // the iterable expression needs to be evaluated, then stored in some reference
        const iterableRef = this.iterableExp.transform(translator, func);
        // then we need to create a new integer reference i initialized to 0
        const iRef = new CreateReference(0);
        func.instructions.push(iRef);
        // then we verify that i is less than the length of the iterable
        const checkInstructionNumber = func.instructions.length;
        const checkRef = new InteropReference([iterableRef, iRef], (iter, i) => i.value < iter.value.length);
        func.instructions.push(checkRef);
        // if it is, we add a scope variable with the name of the iterVar, and initialize it to the array index operation on the iterable using i
        // add a branch that will jump to after the loop if the less-than operation is false
        const branch = new FalseBranch(checkRef);
        func.instructions.push(branch);
        // otherwise, we create a new scope variable for the iterator variable, setting it to the result of an array index operation
        const iterRef = new InteropReference([iterableRef, iRef], (iter, i) => iter.value[i.value]);
        func.instructions.push(iterRef);
        func.instructions.push(new AddToScope(this.iterVar, iterRef));
        // then we insert the body instructions
        this.body.transform(translator, func);
        // remove the iterator variable from the scope
        func.instructions.push(new RemoveFromScope(this.iterVar));
        // then we insert an increment to i
        func.instructions.push(new ReferenceMutate(iRef, i => i + 1)
        // then we insert a jump to the instruction where we check i against the array length
        func.instructions.push(new Jump(checkInstructionNumber));
        // then we insert a noop to be the target of the jump at the top of the loop
        branch.target = func.instructions.length;
        func.instructions.push(new INoop());
    }
}

export class WhileStatement extends Statement {
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

    transform(translator, func) {
        // store the condition value into a reference
        const conditionInstructionNumber = func.instructions.length;
        const conditionRef = this.conditionExp.transform(translator, func);
        // branch if the condition is false
        const branch = new FalseBranch(conditionRef);
        func.instructions.push(branch);
        // insert the body instructions
        this.body.transform(translator, func);
        // jump to the check instruction
        func.instructions.push(new Jump(conditionInstructionNumber));
        // add a false branch target noop
        branch.target = func.instructions.length;
        func.instructions.push(new INoop());
    }
}

export class DoWhileStatement extends Statement {
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

    transform(translator, func) {
        // save the branch location
        const startInstructionNumber = func.instructions.length;
        // insert the body instructions
        this.body.transform(translator, func);
        // store the condition value into a reference
        const conditionRef = this.conditionExp.transform(translator, func);
        // branch if the condition is true
        func.instructions.push(new TrueBranch(conditionRef, startInstructionNumber));
    }
}

export class TryCatchStatement extends Statement {
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

    transform(translator, func) {
        // insert a try frame
        const tryFrame = new PushTryFrame([]);
        func.instructions.push(tryFrame);
        // insert try body
        this.try.transform(translator, func);
        // remove the try frame
        func.instructions.push(new PopTryFrame());
        // insert jump to either finally or after the finally
        const jump = new Jump();
        func.instructions.push(jump);
        // iterate each catch
        for (const { param, body } of this.catches) {
            // save the instruction number to the try frame
            tryFrame.catches.push({ instructionNumber: func.instructions.length, type: param.type });
            // add the catch parameter to the scope
            const errRef = new ErrorRef();
            func.instructions.push(errRef);
            func.instructions.push(new AddToScope(param.name, errRef));
            // insert the catch body
            body.transform(translator, func);
            // remove the catch parameter
            func.instructions.push(new RemoveFromScope(param.name));
            // use same jump as try
            func.instructions.push(jump);
        }
        // finally logic
        if (this.finally) {
            // save location to try frame and jump target
            tryFrame.finally = { start: func.instructions.length };
            jump.target = func.instructions.length;
            // insert finally body
            this.finally.transform(translator, func);
            // insert noop for end of finally
            tryFrame.finally.end = func.instructions.length;
            func.instructions.push(new INoop());
        } else {
            // insert noop, save location as jump target
            jump.target = func.instructions.length;
            func.instructions.push(new INoop());
        }
    }
}

export class ThrowStatement extends Statement {
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

    transform(translator, func) {
        // save expression to ref
        const throwRef = this.exp.transform(translator, func);
        // add throw instruction
        func.instructions.push(new Throw(throwRef));
    }
}

export class ReturnStatement extends Statement {
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

    transform(translator, func) {
        // save expression to ref
        let returnRef;
        if (this.exp) {
            returnRef = this.exp.transform(translator, func);
        } else {
            returnRef = new CreateReference(new RTuple([]));
            func.instructions.push(returnRef);
        }
        // add return expression
        func.instructions.push(new Return(returnRef));
    }
}

export class BreakStatement extends Statement {
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

    transform(translator, func) {
        // TODO: need loop end logic
    }
}

export class ContinueStatement extends Statement {
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

    transform(translator, func) {
        // TODO: need loop start logic
    }
}
