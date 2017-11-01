import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class ReturnStatement extends Statement {
    exp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitReturnStatement(this);
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
