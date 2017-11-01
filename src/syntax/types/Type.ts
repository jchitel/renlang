import { CSTNode, ASTNode } from '../Node';
import { Token } from '../../parser/Tokenizer';
import { ILocation } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export abstract class Type extends ASTNode {}

export class STType extends CSTNode<Type> {
    choice: Token | STType;

    reduce(): Type {
        if (this.choice instanceof Token) {
            if (this.choice.type === 'IDENT') {
                return new IdentifierType(this.choice.image, this.choice.getLocation());
            } else {
                return new PrimitiveType(this.choice.image, this.choice.getLocation());
            }
        } else {
            return this.choice.reduce();
        }
    }
}

/**
 * If this is in its own file, then it will be a circular dependency.
 * KEEP THIS IN THE SAME MODULE AS "Type".
 */
export class PrimitiveType extends Type {
    typeNode: string;

    constructor(typeNode: string, location: ILocation) {
        super();
        this.typeNode = typeNode;
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitPrimitiveType(this);
    }
}

/**
 * If this is in its own file, then it will be a circular dependency.
 * KEEP THIS IN THE SAME MODULE AS "Type".
 */
export class IdentifierType extends Type {
    name: string;

    constructor(name: string, location: ILocation) {
        super();
        this.name = name;
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitIdentifierType(this);
    }
}
