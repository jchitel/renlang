import { Type, STType } from './Type';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class ParenthesizedType extends Type {
    inner: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitParenthesizedType(this);
    }
}

export class STParenthesizedType extends STType {
    openParenToken: Token;
    inner: STType;
    closeParenToken: Token;

    reduce() {
        const node = new ParenthesizedType();
        node.inner = this.inner.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}