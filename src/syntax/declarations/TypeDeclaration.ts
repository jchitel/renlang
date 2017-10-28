import { CSTNode, ASTNode } from '../Node';
import { Token, ILocation } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TGeneric, TParam, TAny } from '../../typecheck/types';
import { Type, STType } from '../types/Type';
import OrderedMap from '../../typecheck/types/OrderedMap';


export class TypeDeclaration extends ASTNode {
    name: string;
    typeParams: TypeParam[];
    typeNode: Type;
    
    resolveType(typeChecker: TypeChecker, module: Module) {
        const context = new TypeCheckContext();
        // if there are type parameters, this is a generic type
        if (this.typeParams) {
            const typeParams = new OrderedMap<TParam>();
            for (const p of this.typeParams) {
                context.typeParams[p.name] = p.getType(typeChecker, module, context) as TParam;
                typeParams.add(p.name, context.typeParams[p.name]);
            }
            return new TGeneric(typeParams, this.typeNode.getType(typeChecker, module, context));
        }
        // otherwise, it just resolves to the type of the type definition
        return this.typeNode.getType(typeChecker, module, context);
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

    getType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.type || (this.type = this.resolveType(typeChecker, module, context));
    }

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // no defined variance means it needs to be inferred from how it is used
        const variance = this.varianceOp === '+' ? 'covariant' : this.varianceOp === '-' ? 'contravariant' : 'invariant';
        // no defined constraint means it defaults to (: any)
        const constraint = this.typeConstraint ? this.typeConstraint.getType(typeChecker, module, context) : new TAny();
        return this.type = new TParam(this.name, variance, constraint);
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
