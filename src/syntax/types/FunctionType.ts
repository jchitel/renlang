import { Type, STType } from './Type';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class FunctionType extends Type {
    paramTypes: Type[];
    returnType: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFunctionType(this);
    }
}

export class STFunctionType extends STType {
    openParenToken: Token;
    paramTypes: STType[];
    closeParenToken: Token;
    fatArrowToken: Token;
    returnType: STType;

    reduce() {
        const node = new FunctionType();
        node.paramTypes = this.paramTypes.map(t => t.reduce());
        node.returnType = this.returnType.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), node.returnType.locations.self);
        return node;
    }
}
