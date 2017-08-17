import ASTNode from './ASTNode';
import { TBool, TTuple, TArray, TUnknown, determineGeneralType } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';
import { Expression } from './expressions';
import {
    Noop as INoop,
    SetIntegerRef,
    InteropReference,
    FalseBranch,
    TrueBranch,
    AddToScope,
    ReferenceMutate,
    Jump,
    PushTryFrame,
    PopFrame,
    ErrorRef,
    Throw,
    Return,
    SetTupleRef,
    PushScopeFrame,
    PushLoopFrame,
    Break,
    Continue,
} from '../runtime/instructions';


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

    translate(translator, func) {
        func.pushScope(new PushScopeFrame());
        for (const statement of this.statements) {
            statement.translate(translator, func);
        }
        func.popScope(new PopFrame());
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

    translate(translator, func) {
        func.addInstruction(new INoop());
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

    /**
     * These are probably the most complex node, because they abstract a lot of runtime constructs.
     * Effectively we convert the loop to a classical for loop, because all of the iterables will just be arrays.
     */
    translate(translator, func) {
        // initialize iterable and i
        const iterableRef = this.iterableExp.translate(translator, func);
        const iRef = func.addRefInstruction(translator, ref => new SetIntegerRef(ref, 0));
        func.pushScope(new PushLoopFrame());
        // check if we should enter the loop, branching if we shouldn't
        const checkInstructionNumber = func.nextInstrNum();
        const checkRef = func.addRefInstruction(translator, ref => new InteropReference(ref, [iterableRef, iRef], (iter, i) => i.value < iter.value.length));
        const branch = func.addInstruction(new FalseBranch(checkRef));
        // loop body, start by adding the iterator variable to the scope, and remove it when we're done
        const iterRef = func.addRefInstruction(translator, ref => new InteropReference(ref, [iterableRef, iRef], (iter, i) => iter.value[i.value]));
        func.addToScope(this.iterVar, iterRef, new AddToScope(this.iterVar, iterRef));
        this.body.translate(translator, func);
        // increment i and jump back to the condition expression
        func.addInstruction(new ReferenceMutate(iRef, i => i + 1));
        func.addInstruction(new Jump(checkInstructionNumber));
        // insert noop as target of the loop
        branch.target = func.nextInstrNum();
        func.popScope(new PopFrame());
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

    translate(translator, func) {
        func.pushScope(new PushLoopFrame());
        // store the condition value into a reference
        const conditionInstructionNumber = func.nextInstrNum();
        const conditionRef = this.conditionExp.translate(translator, func);
        // branch if the condition is false
        const branch = func.addInstruction(new FalseBranch(conditionRef));
        // insert the body instructions
        this.body.translate(translator, func);
        // jump to the check instruction
        func.addInstruction(new Jump(conditionInstructionNumber));
        // add a false branch target noop
        branch.target = func.nextInstrNum();
        func.popScope(new PopLoopFrame());
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

    translate(translator, func) {
        func.pushScope(new PushLoopFrame());
        // save the branch location
        const startInstructionNumber = func.nextInstrNum();
        // insert the body instructions
        this.body.translate(translator, func);
        // store the condition value into a reference
        const conditionRef = this.conditionExp.translate(translator, func);
        // branch if the condition is true
        func.addInstruction(new TrueBranch(conditionRef, startInstructionNumber));
        func.popScope(new PopLoopFrame());
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

    translate(translator, func) {
        // insert a try frame
        const tryFrame = func.pushScope(new PushTryFrame([]));
        // insert try body
        this.try.translate(translator, func);
        // remove the try frame
        func.popScope(new PopFrame());
        // insert jump to either finally or after the finally
        const jump = func.addInstruction(new Jump());
        // iterate each catch
        for (const { param, body } of this.catches) {
            // save the instruction number to the try frame
            tryFrame.catches.push({ ic: func.nextInstrNum(), type: param.type });
            // add the catch parameter to the scope
            func.pushScope(new PushScopeFrame());
            const errRef = func.addRefInstruction(translator, ref => new ErrorRef(ref));
            func.addToScope(param.name, errRef, new AddToScope(param.name, errRef));
            // insert the catch body
            body.translate(translator, func);
            // pop the scope containing the err variable
            func.popScope(new PopScopeFrame());
            // use same jump as try
            func.addInstruction(jump);
        }
        // finally logic
        if (this.finally) {
            // save location to try frame and jump target
            tryFrame.finally = { start: func.nextInstrNum() };
            jump.target = func.nextInstrNum();
            // insert finally body
            this.finally.translate(translator, func);
            // insert noop for end of finally
            tryFrame.finally.end = func.nextInstrNum();
            func.addInstruction(new INoop());
        } else {
            // insert noop, save location as jump target
            jump.target = func.nextInstrNum();
            func.addInstruction(new INoop());
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

    translate(translator, func) {
        // save expression to ref
        const throwRef = this.exp.translate(translator, func);
        // add throw instruction
        func.addInstruction(new Throw(throwRef));
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

    translate(translator, func) {
        // save expression to ref
        let returnRef;
        if (this.exp) {
            returnRef = this.exp.translate(translator, func);
        } else {
            returnRef = func.addRefInstruction(translator, ref => new SetTupleRef(ref, []));
        }
        // add return expression
        func.addInstruction(new Return(returnRef));
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

    translate(translator, func) {
        func.addInstruction(new Break(this.loopNumber));
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

    translate(translator, func) {
        func.addInstruction(new Continue(this.loopNumber));
    }
}
