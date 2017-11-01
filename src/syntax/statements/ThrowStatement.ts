import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class ThrowStatement extends Statement {
    exp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitThrowStatement(this);
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
