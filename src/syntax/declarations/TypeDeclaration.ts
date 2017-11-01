import { CSTNode, ASTNode } from '../Node';
import { Token, ILocation } from '../../parser/Tokenizer';
import { Type, STType } from '../types/Type';
import INodeVisitor from '../INodeVisitor';


export class TypeDeclaration extends ASTNode {
    name: string;
    typeParams: TypeParam[];
    typeNode: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTypeDeclaration(this);
    }
}

export class STTypeDeclaration extends CSTNode<TypeDeclaration> {
    typeToken: Token;
    typeNameToken: Token;
    typeParamList?: STTypeParamList;
    equalsToken: Token;
    typeNode: STType;

    reduce() {
        const node = new TypeDeclaration();
        node.name = this.typeNameToken.image;
        node.registerLocation('name', this.typeNameToken.getLocation());
        if (this.typeParamList) node.typeParams = this.typeParamList.reduce();
        node.typeNode = this.typeNode.reduce();
        return node;
    }
}

export class STTypeParamList extends CSTNode<TypeParam[]> {
    openLtToken: Token;
    typeParams: STTypeParam[];
    closeGtToken: Token;

    reduce() {
        // semantically, this is a pointless node, so we just return the list of param nodes directly
        return this.typeParams.map(p => p.reduce());
    }
}

export class TypeParam extends ASTNode {
    name: string;
    varianceOp: string;
    typeConstraint: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTypeParam(this);
    }
}

export class STTypeParam extends CSTNode<TypeParam> {
    nameToken: Token;
    varianceOp: STVarianceOp;
    typeConstraint: STTypeConstraint;

    reduce() {
        const node = new TypeParam();
        let start = this.nameToken.getLocation();
        let end = start;
        if (this.varianceOp) {
            const { op, loc } = this.varianceOp.reduce();
            node.varianceOp = op;
            node.registerLocation('variance', loc);
            start = loc;
        }
        node.name = this.nameToken.image;
        node.registerLocation('name', this.nameToken.getLocation());
        if (this.typeConstraint) {
            const { typeNode, loc } = this.typeConstraint.reduce();
            node.typeConstraint = typeNode;
            node.registerLocation('constraint', loc);
            end = loc;
        }
        node.createAndRegisterLocation('self', start, end);
        return node;
    }
}

export class STVarianceOp extends CSTNode<{ op: string, loc: ILocation }> {
    covariantToken: Token;
    contravariantToken: Token;

    reduce() {
        const tok = this.covariantToken || this.contravariantToken;
        return { op: tok.image, loc: tok.getLocation() };
    }
}

export class STTypeConstraint extends CSTNode<{ typeNode: Type, loc: ILocation }> {
    colonToken: Token;
    constraintType: STType;

    reduce() {
        const opLoc = this.colonToken.getLocation();
        const typeNode = this.constraintType.reduce();
        return {
            typeNode,
            loc: {
                startLine: opLoc.startLine,
                endLine: typeNode.locations.self.endLine,
                startColumn: opLoc.startColumn,
                endColumn: typeNode.locations.self.endColumn,
            },
        };
    }
}
