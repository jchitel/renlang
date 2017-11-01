import { CSTNode } from '../Node';
import { Statement, STStatement } from './Statement';
import { STParam, Param } from '../declarations';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class TryCatchStatement extends Statement {
    try: Statement;
    catches: Catch[];
    finally: Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTryCatchStatement(this);
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
