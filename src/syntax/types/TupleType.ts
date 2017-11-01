import { Type, STType } from './Type';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class TupleType extends Type {
    types: Type[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTupleType(this);
    }
}

export class STTupleType extends STType {
    openParenToken: Token;
    types: STType[];
    closeParenToken: Token;

    reduce() {
        const node = new TupleType();
        node.types = this.types.map(t => t.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}
