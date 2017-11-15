import ASTNode from '~/syntax/ASTNode';
import { Location } from '~/parser/Tokenizer';
import INodeVisitor from '~/syntax/INodeVisitor';


export abstract class Type extends ASTNode {}

export class PrimitiveType extends Type {
    typeNode: string;

    constructor(typeNode: string, location: Location) {
        super();
        this.typeNode = typeNode;
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitPrimitiveType(this);
    }
}

export class IdentifierType extends Type {
    name: string;

    constructor(name: string, location: Location) {
        super();
        this.name = name;
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitIdentifierType(this);
    }
}

export class ArrayType extends Type {
    baseType: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitArrayType(this);
    }
}

export class FunctionType extends Type {
    paramTypes: Type[];
    returnType: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFunctionType(this);
    }
}

export class ParenthesizedType extends Type {
    inner: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitParenthesizedType(this);
    }
}

export class SpecificType extends Type {
    name: string;
    typeArgs: Type[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitSpecificType(this);
    }
}

export class StructType extends Type {
    fields: { type: Type, name: string }[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitStructType(this);
    }
}

export class TupleType extends Type {
    types: Type[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTupleType(this);
    }
}

export class UnionType extends Type {
    types: Type[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitUnionType(this);
    }
}

export class NamespaceAccessType extends Type {
    baseType: Type;
    typeName: string;

    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitNamespaceAccessType(this);
    }
}
