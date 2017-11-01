import ASTNode from '../ASTNode';
import { ILocation } from '../../parser/Tokenizer'
import INodeVisitor from '../INodeVisitor';
import { Param } from '../declarations/ast';
import { Expression } from '../expressions/ast';


export abstract class Statement extends ASTNode {}

export class Block extends Statement {
    statements: Statement[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBlock(this);
    }
}

/**
 * Represents a statement that does nothing, representable in code by {}.
 * Inside another block, this is effectively nothing, but this has semantic meaning as a function body or statement body.
 */
export class Noop extends Statement {
    constructor(startLoc: ILocation, endLoc: ILocation) {
        super();
        this.createAndRegisterLocation('self', startLoc, endLoc);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitNoop(this);
    }
}

export class BreakStatement extends Statement {
    loopNumber: number;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBreakStatement(this);
    }
}

export class ContinueStatement extends Statement {
    loopNumber: number;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitContinueStatement(this);
    }
}

export class DoWhileStatement extends Statement {
    body: Statement;
    conditionExp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitDoWhileStatement(this);
    }
}

export class ForStatement extends Statement {
    iterVar: string;
    iterableExp: Expression;
    body: Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitForStatement(this);
    }
}

export class ReturnStatement extends Statement {
    exp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitReturnStatement(this);
    }
}

export class ThrowStatement extends Statement {
    exp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitThrowStatement(this);
    }
}

type Catch = { param: Param, body: Statement };

export class TryCatchStatement extends Statement {
    try: Statement;
    catches: Catch[];
    finally: Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTryCatchStatement(this);
    }
}

export class WhileStatement extends Statement {
    conditionExp: Expression;
    body: Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitWhileStatement(this);
    }
}
