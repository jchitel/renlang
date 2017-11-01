import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class DoWhileStatement extends Statement {
    body: Statement;
    conditionExp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitDoWhileStatement(this);
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
