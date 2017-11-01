import ASTNode from '../ASTNode';
import { ILocation } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';
import { UnaryOperator, BinaryOperator } from '../../runtime/operators';
import { Type } from '../types/ast';
import { Param } from '../declarations/ast';
import { Statement } from '../statements/ast';
import { TFunction } from '../../typecheck/types';


export abstract class Expression extends ASTNode {}

export class BoolLiteral extends Expression {
    value: boolean;

    constructor(image: string, location: ILocation) {
        super();
        this.value = image === 'true';
        this.registerLocation('self', location);
    }
    
    visit<T>(visitor: INodeVisitor<T>): T {
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
    
    visit<T>(visitor: INodeVisitor<T>): T {
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
    
    visit<T>(visitor: INodeVisitor<T>): T {
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
    
    visit<T>(visitor: INodeVisitor<T>): T {
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
    
    visit<T>(visitor: INodeVisitor<T>): T {
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
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitStringLiteral(this);
    }
}

export class ArrayAccess extends Expression {
    target: Expression;
    indexExp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitArrayAccess(this);
    }
}

export class ArrayLiteral extends Expression {
    items: Expression[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitArrayLiteral(this);
    }
}

export class BinaryExpression extends Expression {
    left: Expression;
    right: Expression;
    symbol: string;
    operator: BinaryOperator;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBinaryExpression(this);
    }
}

export class FieldAccess extends Expression {
    target: Expression;
    field: string;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFieldAccess(this);
    }
}

export class FunctionApplication extends Expression {
    target: Expression;
    typeArgs: Type[];
    args: Expression[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFunctionApplication(this);
    }
}

export class IfElseExpression extends Expression {
    condition: Expression;
    consequent: Expression;
    alternate: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitIfElseExpression(this);
    }
}

export class LambdaExpression extends Expression {
    params: (Param | LambdaParam)[];
    body: Expression | Statement;
    type: TFunction;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitLambdaExpression(this);
    }

    prettyName() {
        return `<lambda>(${this.params.map(p => p.prettyName()).join(', ')})`;
    }
}

export class LambdaParam extends ASTNode {
    name: string;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitLambdaParam(this);
    }

    prettyName() {
        return this.name;
    }
}

export class ParenthesizedExpression extends Expression {
    inner: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitParenthesizedExpression(this);
    }
}

export class StructLiteral extends Expression {
    entries: { key: string, value: Expression }[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitStructLiteral(this);
    }
}

export class TupleLiteral extends Expression {
    items: Expression[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTupleLiteral(this);
    }
}

export class UnaryExpression extends Expression {
    target: Expression;
    symbol: string;
    prefix: boolean;
    operator: UnaryOperator;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitUnaryExpression(this);
    }
}

export class VarDeclaration extends Expression {
    name: string;
    initExp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitVarDeclaration(this);
    }
}
