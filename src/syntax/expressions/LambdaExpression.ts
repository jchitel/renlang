import { ASTNode, CSTNode } from '../Node';
import { Expression, STExpression } from './Expression';
import { Param, STParam } from '../declarations';
import { Statement, STStatement } from '../statements';
import { Token } from '../../parser/Tokenizer';
import { TFunction } from '../../typecheck/types';
import INodeVisitor from '../INodeVisitor';


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

export class STLambdaExpression extends STExpression {
    openParenToken?: Token;
    shorthandParam?: Token;
    params: STLambdaParam[];
    closeParenToken?: Token;
    fatArrowToken: Token;
    functionBody: STExpression | STStatement;

    reduce() {
        const node = new LambdaExpression();
        if (this.shorthandParam) node.params = [new STLambdaParam({ choice: this.shorthandParam }, []).reduce()];
        else node.params = this.params.map(p => p.reduce());
        node.body = this.functionBody.reduce();
        // lambda expression start location is complicated because it can either be a '(' or a param name
        node.createAndRegisterLocation('self',
            this.openParenToken ? this.openParenToken.getLocation() : node.params[0].locations.name,
            node.body.locations.self);
        return node;
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

export class STLambdaParam extends CSTNode<Param | LambdaParam> {
    choice: STParam | Token;

    reduce(): Param | LambdaParam {
        if (this.choice instanceof STParam) return this.choice.reduce();
        const node = new LambdaParam();
        node.name = this.choice.image;
        node.registerLocation('name', this.choice.getLocation());
        return node;
    }
}
