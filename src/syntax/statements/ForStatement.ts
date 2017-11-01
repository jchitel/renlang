import { Statement, STStatement } from './Statement';
import { Expression, STExpression } from '../expressions';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class ForStatement extends Statement {
    iterVar: string;
    iterableExp: Expression;
    body: Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitForStatement(this);
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
