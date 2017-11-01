import CSTNode from '../CSTNode';
import { Token } from '../../parser/Tokenizer';
import {
    Statement, Block, Noop, BreakStatement, ContinueStatement, DoWhileStatement, ForStatement, ReturnStatement,
    ThrowStatement, TryCatchStatement, WhileStatement
} from './ast';
import { Param } from '../declarations/ast';
import { STParam } from '../declarations/cst';
import { STExpression } from '../expressions/cst';


export class STStatement extends CSTNode<Statement> {
    choice: STStatement;

    reduce(): Statement {
        return this.choice.reduce();
    }
}

export class STBlock extends STStatement {
    openBraceToken: Token;
    statements: STStatement[];
    closeBraceToken: Token;

    reduce() {
        const node = new Block();
        // filter out noops, because noops inside blocks mean nothing
        node.statements = this.statements.map(s => s.reduce()).filter(s => !(s instanceof Noop));
        // once all noops have been removed, if this is now empty, return a noop
        if (!node.statements.length) return new Noop(this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}

export class STBreakStatement extends STStatement {
    breakToken: Token;
    loopNumber?: Token;

    reduce() {
        const node = new BreakStatement();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.breakToken.getLocation(), this.loopNumber.getLocation());
        } else {
            node.loopNumber = 0;
            node.registerLocation('self', this.breakToken.getLocation());
        }
        return node;
    }
}

export class STContinueStatement extends STStatement {
    continueToken: Token;
    loopNumber?: Token;

    reduce() {
        const node = new ContinueStatement();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.continueToken.getLocation(), this.loopNumber.getLocation());
        } else {
            node.loopNumber = 0;
            node.registerLocation('self', this.continueToken.getLocation());
        }
        return node;
    }
}

export class STDoWhileStatement extends STStatement {
    doToken: Token;
    body: STStatement;
    whileToken: Token;
    openParenToken: Token;
    conditionExp: STExpression;
    closeParenToken: Token;

    reduce() {
        const node = new DoWhileStatement();
        node.body = this.body.reduce();
        node.conditionExp = this.conditionExp.reduce();
        node.createAndRegisterLocation('self', this.doToken.getLocation(), this.closeParenToken.getLocation());
        return node;
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

export class STReturnStatement extends STStatement {
    returnToken: Token;
    exp?: STExpression;

    reduce() {
        const node = new ReturnStatement();
        if (this.exp) {
            node.exp = this.exp.reduce();
            node.createAndRegisterLocation('self', this.returnToken.getLocation(), node.exp.locations.self);
        } else {
            node.registerLocation('self', this.returnToken.getLocation());
        }
        return node;
    }
}

export class STThrowStatement extends STStatement {
    throwToken: Token;
    exp: STExpression;

    reduce() {
        const node = new ThrowStatement();
        node.exp = this.exp.reduce();
        node.createAndRegisterLocation('self', this.throwToken.getLocation(), node.exp.locations.self);
        return node;
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

export class STWhileStatement extends STStatement {
    whileToken: Token;
    openParenToken: Token;
    conditionExp: STExpression;
    closeParenToken: Token;
    body: STStatement;

    reduce() {
        const node = new WhileStatement();
        node.conditionExp = this.conditionExp.reduce();
        node.body = this.body.reduce();
        node.createAndRegisterLocation('self', this.whileToken.getLocation(), node.body.locations.self);
        return node;
    }
}
