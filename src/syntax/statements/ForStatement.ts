import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import TypeCheckError from '../../typecheck/TypeCheckError';
import { TYPE_MISMATCH } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import { TUnknown } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import {
    SetIntegerRef,
    PushLoopFrame,
    InteropReference,
    FalseBranch,
    AddToScope,
    ReferenceMutate,
    Jump,
    PopFrame
} from '../../runtime/instructions';
import { RBool, RInteger } from '../../runtime/types';


export class ForStatement extends Statement {
    iterVar: string;
    iterableExp: Expression;
    body: Statement;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // type check the iterable expression, will fill in the base type of the array
        const arrayType = this.iterableExp.resolveType(typeChecker, module, context);
        let iterType;
        if (!arrayType.isArray()) {
            typeChecker.errors.push(new TypeCheckError(TYPE_MISMATCH(arrayType, 'T[]'), module.path, this.iterableExp.locations.self));
            iterType = new TUnknown();
        } else {
            iterType = arrayType.getBaseType();
        }
        // add the iterator variable to the symbol table, visit the body, then remove it
        context.symbolTable[this.iterVar] = iterType;
        // increment the loop number
        context.loopNumber++;
        const returnType = this.body.resolveType(typeChecker, module, context);
        delete context.symbolTable[this.iterVar];
        context.loopNumber--;
        return returnType;
    }

    /**
     * This is probably the most complex node, because it abstracts a lot of runtime constructs.
     * Effectively we convert the loop to a classical for loop, because all of the iterables will just be arrays.
     */
    translate(translator: Translator, func: Func) {
        // initialize iterable and i
        const iterableRef = this.iterableExp.translate(translator, func);
        const iRef = func.addRefInstruction(translator, ref => new SetIntegerRef(ref, 0));
        const loopFrame = func.pushScope(new PushLoopFrame({ start: func.nextInstrNum() + 1 }));
        // check if we should enter the loop, branching if we shouldn't
        const checkInstructionNumber = func.nextInstrNum();
        const checkRef = func.addRefInstruction(translator, ref => new InteropReference({
            ref,
            inRefs: [iterableRef, iRef], 
            operation: (iter, i) => new RBool(i.value < iter.value.length)
        }));
        const branch = func.addInstruction(new FalseBranch({ ref: checkRef }));
        // loop body, start by adding the iterator variable to the scope, and remove it when we're done
        const iterRef = func.addRefInstruction(translator, ref => new InteropReference({
            ref,
            inRefs: [iterableRef, iRef],
            operation: (iter, i) => iter.value[i.value]
        }));
        func.addToScope(this.iterVar, iterRef, new AddToScope(this.iterVar, iterRef));
        this.body.translate(translator, func);
        // increment i and jump back to the condition expression
        func.addInstruction(new ReferenceMutate({ ref: iRef, mutator: i => new RInteger(i.value + 1) }));
        func.addInstruction(new Jump({ target: checkInstructionNumber }));
        // insert noop as target of the loop
        branch.target = func.nextInstrNum();
        loopFrame.end = branch.target;
        func.popScope(new PopFrame());
    }
}

export class STForStatement extends STStatement {
    forToken: Token;
    openParenToken: Token;
    iterVarToken: Token;
    inToken: Token;
    iterableExp: STExpression;
    closeParenToken: Token;
    body: STStatement;

    reduce() {
        const node = new ForStatement();
        node.iterVar = this.iterVarToken.image;
        node.registerLocation('iterVar', this.iterVarToken.getLocation());
        node.iterableExp = this.iterableExp.reduce();
        node.body = this.body.reduce();
        node.createAndRegisterLocation('self', this.forToken.getLocation(), node.body.locations.self);
        return node;
    }
}
