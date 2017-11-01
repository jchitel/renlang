import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class WhileStatement extends Statement {
    conditionExp: Expression;
    body: Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitWhileStatement(this);
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
