import { ASTNode, CSTNode } from '../Node';
import { Token } from '../../parser/Tokenizer';
import { STTypeParamList, TypeParam } from './TypeDeclaration';
import { Type, STType } from '../types/Type';
import { Expression, STExpression } from '../expressions';
import { Statement, STStatement, STBlock } from '../statements';
import INodeVisitor from '../INodeVisitor';


export class FunctionDeclaration extends ASTNode {
    returnType: Type;
    name: string;
    typeParams: TypeParam[];
    params: Param[];
    body: Expression | Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFunctionDeclaration(this);
    }

    prettyName() {
        return `${this.name}(${this.params.map(p => p.prettyName()).join(', ')})`;
    }
}

export class STFunctionDeclaration extends CSTNode<FunctionDeclaration> {
    funcToken: Token;
    returnType: STType;
    functionNameToken: Token;
    typeParamList: STTypeParamList;
    paramsList: STParameterList;
    fatArrowToken: Token;
    functionBody: STFunctionBody;

    reduce() {
        const node = new FunctionDeclaration();
        node.name = this.functionNameToken.image;
        node.registerLocation('name', this.functionNameToken.getLocation());
        node.returnType = this.returnType.reduce();
        if (this.typeParamList) node.typeParams = this.typeParamList.reduce();
        node.params = this.paramsList.reduce();
        node.body = this.functionBody.reduce();
        node.createAndRegisterLocation('self', node.locations.name, node.body.locations.self);
        return node;
    }
}

export class STParameterList extends CSTNode<Param[]> {
    openParenToken: Token;
    params: STParam[];
    closeParenToken: Token;

    reduce() {
        // semantically, this is a pointless node, so we just return the list of param nodes directly
        return this.params.map(p => p.reduce());
    }
}

export class Param extends ASTNode {
    name: string;
    typeNode: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitParam(this);
    }

    prettyName() {
        return `${this.type} ${this.name}`;
    }
}

export class STParam extends CSTNode<Param> {
    typeNode: STType;
    nameToken: Token;

    reduce() {
        const node = new Param();
        node.typeNode = this.typeNode.reduce();
        node.name = this.nameToken.image;
        node.registerLocation('name', this.nameToken.getLocation());
        return node;
    }
}

export class STFunctionBody extends CSTNode<Statement | Expression> {
    blockBody: STBlock;
    expressionBody: STExpression;
    statementBody: STStatement;

    reduce() {
        if (this.blockBody) return this.blockBody.reduce();
        else if (this.expressionBody) return this.expressionBody.reduce();
        else if (this.statementBody) return this.statementBody.reduce();
        else throw new Error('this should never happen');
    }
}
