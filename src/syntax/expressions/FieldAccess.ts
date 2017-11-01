import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class FieldAccess extends Expression {
    target: Expression;
    field: string;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFieldAccess(this);
    }
}

export class STFieldAccess extends STExpression {
    target: STExpression;
    dotToken: Token;
    fieldNameToken: Token;

    reduce() {
        const node = new FieldAccess();
        node.target = this.target.reduce();
        node.field = this.fieldNameToken.image;
        node.registerLocation('field', this.fieldNameToken.getLocation());
        node.createAndRegisterLocation('self', node.target.locations.self, node.locations.field);
        return node;
    }
}
