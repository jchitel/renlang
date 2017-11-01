import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class ArrayAccess extends Expression {
    target: Expression;
    indexExp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitArrayAccess(this);
    }
}

export class STArrayAccess extends STExpression {
    target: STExpression;
    openBracketToken: Token;
    indexExp: STExpression;
    closeBracketToken: Token;

    reduce() {
        const node = new ArrayAccess();
        node.target = this.target.reduce();
        node.indexExp = this.indexExp.reduce();
        node.createAndRegisterLocation('self', node.target.locations.self, this.closeBracketToken.getLocation());
        return node;
    }
}
