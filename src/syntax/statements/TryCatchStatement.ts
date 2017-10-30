import { CSTNode } from '../Node';
import { Statement, STStatement } from './Statement';
import { STParam, Param } from '../declarations';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { determineGeneralType } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import {
    PushTryFrame,
    PushScopeFrame,
    Jump,
    PopFrame,
    ErrorRef,
    AddToScope,
    Noop
} from '../../runtime/instructions';


export class TryCatchStatement extends Statement {
    try: Statement;
    catches: Catch[];
    finally: Statement;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // type check the try
        let returnType = this.try.getType(typeChecker, module, context);
        // type check each try
        for (const cat of this.catches) {
            // add the param to the symbol table, type check the catch, remove it
            context.symbolTable[cat.param.name] = cat.param.typeNode.getType(typeChecker, module, context);
            const returnType1 = cat.body.getType(typeChecker, module, context);
            returnType = determineGeneralType(returnType, returnType1);
            delete context.symbolTable[cat.param.name];
        }
        if (!this.finally) return returnType;
        // type check the finally
        const returnType1 = this.finally.getType(typeChecker, module, context);
        return determineGeneralType(returnType, returnType1);
    }

    translate(translator: Translator, func: Func) {
        // insert a try frame
        const tryFrame = func.pushScope(new PushTryFrame({ catches: [] }));
        // insert try body
        this.try.translate(translator, func);
        // remove the try frame
        func.popScope(new PopFrame());
        // insert jump to either finally or after the finally
        const jump = func.addInstruction(new Jump());
        // iterate each catch
        for (const { param, body } of this.catches) {
            // save the instruction number to the try frame
            tryFrame.catches.push({ start: func.nextInstrNum(), type: param.typeNode.type });
            // add the catch parameter to the scope
            func.pushScope(new PushScopeFrame());
            const errRef = func.addRefInstruction(translator, ref => new ErrorRef(ref));
            func.addToScope(param.name, errRef, new AddToScope(param.name, errRef));
            // insert the catch body
            body.translate(translator, func);
            // pop the scope containing the err variable
            func.popScope(new PopFrame());
            // use same jump as try
            func.addInstruction(jump);
        }
        // finally logic
        if (this.finally) {
            // save location to try frame and jump target
            tryFrame.finally = { start: func.nextInstrNum(), end: NaN };
            jump.target = func.nextInstrNum();
            // insert finally body
            this.finally.translate(translator, func);
            // insert noop for end of finally
            tryFrame.finally.end = func.nextInstrNum();
            func.addInstruction(new Noop());
        } else {
            // insert noop, save location as jump target
            jump.target = func.nextInstrNum();
            func.addInstruction(new Noop());
        }
    }
}

export class STTryCatchStatement extends STStatement {
    tryToken: Token;
    tryBody: STStatement;
    catches: STCatchClause[];
    finally?: STFinallyClause;

    reduce() {
        const node = new TryCatchStatement();
        node.try = this.tryBody.reduce();
        node.catches = this.catches.map(c => c.reduce());
        if (this.finally) node.finally = this.finally.reduce();
        node.createAndRegisterLocation('self', this.tryToken.getLocation(), node.finally ? node.finally.locations.self : node.catches[node.catches.length - 1].body.locations.self);
        return node;
    }
}

type Catch = { param: Param, body: Statement };

export class STCatchClause extends CSTNode<Catch> {
    catchToken: Token;
    openParenToken: Token;
    param: STParam;
    closeParenToken: Token;
    body: STStatement;

    reduce() {
        return {
            param: this.param.reduce(),
            body: this.body.reduce(),
        };
    }
}

export class STFinallyClause extends CSTNode<Statement> {
    finallyToken: Token;
    body: STStatement;

    reduce() {
        return this.body.reduce();
    }
}
