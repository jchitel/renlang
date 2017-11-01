import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class IfElseExpression extends Expression {
    condition: Expression;
    consequent: Expression;
    alternate: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitIfElseExpression(this);
    }
}

export class STIfElseExpression extends STExpression {
    ifToken: Token;
    openParenToken: Token;
    condition: STExpression;
    closeParenToken: Token;
    consequent: STExpression;
    elseToken: Token;
    alternate: STExpression;

    reduce() {
        const node = new IfElseExpression();
        node.condition = this.condition.reduce();
        node.consequent = this.consequent.reduce();
        node.alternate = this.alternate.reduce();
        node.createAndRegisterLocation('self', this.ifToken.getLocation(), node.alternate.locations.self);
        return node;
    }
}
