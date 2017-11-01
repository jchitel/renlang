import { Expression, STExpression } from './Expression';
import { STTypeArgList, Type } from '../types';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class FunctionApplication extends Expression {
    target: Expression;
    typeArgs: Type[];
    args: Expression[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFunctionApplication(this);
    }
}

export class STFunctionApplication extends STExpression {
    target: STExpression;
    typeArgList: STTypeArgList;
    openParenToken: Token;
    args: STExpression[];
    closeParenToken: Token;

    reduce() {
        const node = new FunctionApplication();
        node.target = this.target.reduce();
        if (this.typeArgList) node.typeArgs = this.typeArgList.reduce();
        node.args = this.args.map(v => v.reduce());
        node.createAndRegisterLocation('self', node.target.locations.self, this.closeParenToken.getLocation());
        return node;
    }
}
