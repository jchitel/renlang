import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class TupleLiteral extends Expression {
    items: Expression[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTupleLiteral(this);
    }
}

export class STTupleLiteral extends STExpression {
    openParenToken: Token;
    items: STExpression[];
    closeParenToken: Token;

    reduce() {
        const node = new TupleLiteral();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}
