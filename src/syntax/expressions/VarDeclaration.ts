import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class VarDeclaration extends Expression {
    name: string;
    initExp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitVarDeclaration(this);
    }
}

export class STVarDeclaration extends STExpression {
    varIdentToken: Token;
    equalsToken: Token;
    initialValue: STExpression;

    reduce() {
        const node = new VarDeclaration();
        node.name = this.varIdentToken.image;
        node.registerLocation('name', this.varIdentToken.getLocation());
        node.initExp = this.initialValue.reduce();
        node.createAndRegisterLocation('self', node.locations.name, node.initExp.locations.self);
        return node;
    }
}
