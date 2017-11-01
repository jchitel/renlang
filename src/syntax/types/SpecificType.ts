import { CSTNode } from '../Node';
import { STType, Type } from './Type';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class SpecificType extends Type {
    name: string;
    typeArgs: Type[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitSpecificType(this);
    }
}

export class STSpecificType extends STType {
    nameToken: Token;
    typeArgList: STTypeArgList;

    reduce() {
        const node = new SpecificType();
        node.name = this.nameToken.image;
        node.registerLocation('name', this.nameToken.getLocation());
        node.typeArgs = this.typeArgList.reduce();
        node.createAndRegisterLocation('self', node.locations.name, this.typeArgList.closeGtToken.getLocation());
        return node;
    }
}

export class STTypeArgList extends CSTNode<Type[]> {
    openLtToken: Token;
    closeGtToken: Token;
    types: STType[];

    reduce() {
        return this.types.map(t => t.reduce());
    }
}
