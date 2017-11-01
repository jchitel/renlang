import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class ParenthesizedExpression extends Expression {
    inner: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitParenthesizedExpression(this);
    }
}

export class STParenthesizedExpression extends STExpression {
    openParenToken: Token;
    inner: STExpression;
    closeParenToken: Token;

    reduce() {
        const node = new ParenthesizedExpression();
        node.inner = this.inner.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}
