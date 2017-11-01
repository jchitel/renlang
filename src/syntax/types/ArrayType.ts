import { STType, Type } from './Type';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';



export class ArrayType extends Type {
    baseType: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitArrayType(this);
    }
}

export class STArrayType extends STType {
    baseType: STType;
    openBracketToken: Token;
    closeBracketToken: Token;

    reduce() {
        const node = new ArrayType();
        node.baseType = this.baseType.reduce();
        node.createAndRegisterLocation('self', node.baseType.locations.self, this.closeBracketToken.getLocation());
        return node;
    }
}