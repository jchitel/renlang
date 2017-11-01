import { Type, STType } from './Type';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class UnionType extends Type {
    types: Type[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitUnionType(this);
    }
}

export class STUnionType extends STType {
    left: STType;
    vbarToken: Token;
    right: STType;

    reduce() {
        const node = new UnionType();
        // collapse the left and right types into a single list if they are union types
        const left = this.left.reduce();
        if (left instanceof UnionType) node.types = [...left.types];
        else node.types = [left];
        const right = this.right.reduce();
        if (right instanceof UnionType) node.types = [...node.types, ...right.types];
        else node.types.push(right);
        node.createAndRegisterLocation('self', left.locations.self, right.locations.self);
        return node;
    }
}
