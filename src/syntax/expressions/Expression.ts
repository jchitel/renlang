import { ASTNode, CSTNode } from '../Node';
import { Token } from '../../parser/Tokenizer';
import { ILocation } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export abstract class Expression extends ASTNode {}

export class STExpression extends CSTNode<Expression> {
    choice: Token | STExpression;

    reduce(): Expression {
        if (this.choice instanceof Token) {
            if (this.choice.type === 'INTEGER_LITERAL') {
                return new IntegerLiteral(this.choice.value as number, this.choice.getLocation());
            } else if (this.choice.type === 'FLOAT_LITERAL') {
                return new FloatLiteral(this.choice.value as number, this.choice.getLocation());
            } else if (this.choice.type === 'CHAR_LITERAL') {
                return new CharLiteral(this.choice.value as string, this.choice.getLocation());
            } else if (this.choice.type === 'STRING_LITERAL') {
                return new StringLiteral(this.choice.value as string, this.choice.getLocation());
            } else if (['TRUE', 'FALSE'].includes(this.choice.type)) {
                return new BoolLiteral(this.choice.image, this.choice.getLocation());
            } else {
                return new IdentifierExpression(this.choice.image, this.choice.getLocation());
            }
        } else {
            return this.choice.reduce();
        }
    }
}

export class BoolLiteral extends Expression {
    value: boolean;

    constructor(image: string, location: ILocation) {
        super();
        this.value = image === 'true';
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBoolLiteral(this);
    }
}

export class CharLiteral extends Expression {
    value: string;

    constructor(value: string, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitCharLiteral(this);
    }
}

export class FloatLiteral extends Expression {
    value: number;

    constructor(value: number, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFloatLiteral(this);
    }
}

export class IdentifierExpression extends Expression {
    name: string;

    constructor(name: string, location: ILocation) {
        super();
        this.name = name;
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitIdentifierExpression(this);
    }
}

export class IntegerLiteral extends Expression {
    value: number;

    constructor(value: number, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitIntegerLiteral(this);
    }
}

export class StringLiteral extends Expression {
    value: string;

    constructor(value: string, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitStringLiteral(this);
    }
}
