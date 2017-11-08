import CSTNode from '~/syntax/CSTNode';
import { Token } from '~/parser/Tokenizer';
import { STParam } from '~/syntax/declarations/cst';
import { STExpressionNode } from '~/syntax/expressions/cst';


export class STStatementNode extends CSTNode {
    choice: STStatement;
}

export abstract class STStatement extends CSTNode {}

export class STBlock extends STStatement {
    openBraceToken: Token;
    statements: STStatementNode[];
    closeBraceToken: Token;
}

export class STBreakStatement extends STStatement {
    breakToken: Token;
    loopNumber?: Token;
}

export class STContinueStatement extends STStatement {
    continueToken: Token;
    loopNumber?: Token;
}

export class STDoWhileStatement extends STStatement {
    doToken: Token;
    body: STStatementNode;
    whileToken: Token;
    openParenToken: Token;
    conditionExp: STExpressionNode;
    closeParenToken: Token;
}

export class STForStatement extends STStatement {
    forToken: Token;
    openParenToken: Token;
    iterVarToken: Token;
    inToken: Token;
    iterableExp: STExpressionNode;
    closeParenToken: Token;
    body: STStatementNode;
}

export class STReturnStatement extends STStatement {
    returnToken: Token;
    exp?: STExpressionNode;
}

export class STThrowStatement extends STStatement {
    throwToken: Token;
    exp: STExpressionNode;
}

export class STTryCatchStatement extends STStatement {
    tryToken: Token;
    tryBody: STStatementNode;
    catches: STCatchClause[];
    finally?: STFinallyClause;
}

export class STCatchClause extends CSTNode {
    catchToken: Token;
    openParenToken: Token;
    param: STParam;
    closeParenToken: Token;
    body: STStatementNode;
}

export class STFinallyClause extends CSTNode {
    finallyToken: Token;
    body: STStatementNode;
}

export class STWhileStatement extends STStatement {
    whileToken: Token;
    openParenToken: Token;
    conditionExp: STExpressionNode;
    closeParenToken: Token;
    body: STStatementNode;
}
