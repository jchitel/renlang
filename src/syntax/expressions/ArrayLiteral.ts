import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class ArrayLiteral extends Expression {
    items: Expression[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitArrayLiteral(this);
    }
}

export class STArrayLiteral extends STExpression {
    openBracketToken: Token;
    items: STExpression[];
    closeBracketToken: Token;

    reduce() {
        const node = new ArrayLiteral();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openBracketToken.getLocation(), this.closeBracketToken.getLocation());
        return node;
    }
}
