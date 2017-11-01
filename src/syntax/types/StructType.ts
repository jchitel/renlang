import { CSTNode } from '../Node';
import { STType, Type } from './Type';
import { Token, ILocation } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class StructType extends Type {
    fields: { type: Type, name: string }[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitStructType(this);
    }
}

export class STStructType extends STType {
    openBraceToken: Token;
    fields: STField[];
    closeBraceToken: Token;

    reduce() {
        const node = new StructType();
        node.fields = [];
        for (const field of this.fields) {
            const { type, name, loc } = field.reduce();
            node.fields.push({ type, name });
            node.registerLocation(`field_${name}`, loc);
        }
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}

export class STField extends CSTNode<{ type: Type, name: string, loc: ILocation }> {
    typeNode: STType;
    nameToken: Token;

    reduce() {
        return {
            type: this.typeNode.reduce(),
            name: this.nameToken.image,
            loc: this.nameToken.getLocation(),
        };
    }
}
