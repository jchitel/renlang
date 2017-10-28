import { ASTNode, CSTNode, TypedNode } from '../Node';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TType, TFunction, TParam, TUnknown } from '../../typecheck/types';
import { STTypeParamList, TypeParam } from './TypeDeclaration';
import { Type, STType } from '../types/Type';
import { Expression, STExpression } from '../expressions';
import { Statement, STStatement, STBlock } from '../statements';
import { TYPE_MISMATCH } from '../../typecheck/TypeCheckerMessages';
import OrderedMap from '../../typecheck/types/OrderedMap';


export class FunctionDeclaration extends ASTNode {
    returnType: Type;
    name: string;
    typeParams: TypeParam[];
    params: Param[];
    body: Expression | Statement;

    resolveType(typeChecker: TypeChecker, module: Module) {
        let type: TType;
        const context = new TypeCheckContext();
        // resolve type parameter types (this must be done first because param and return types may use them)
        let typeParams: OrderedMap<TParam> | undefined;
        if (this.typeParams) {
            typeParams = new OrderedMap();
            for (const p of this.typeParams) {
                context.typeParams[p.name] = p.getType(typeChecker, module, context) as TParam;
                typeParams.add(p.name, context.typeParams[p.name]);
            }
        }
        // resolve types of parameters and return type
        const paramTypes = this.params.map(p => p.getType(typeChecker, module, context));
        const returnType = this.returnType.getType(typeChecker, module, context);
        // the type of the function will be unknown if any component types are unknown, otherwise it has a function type
        if (paramTypes.some(t => t instanceof TUnknown) || returnType instanceof TUnknown) type = new TUnknown();
        else type = new TFunction(paramTypes, returnType, typeParams);
        // create a symbol table initialized to contain the parameters
        for (let i = 0; i < this.params.length; ++i) {
            context.symbolTable[this.params[i].name] = paramTypes[i];
        }
        // type check the function body, passing along the starting symbol table and the return type of the function as the expected type of the body
        const actualReturnType = this.body.getType(typeChecker, module, context) as TType;
        if (!(returnType instanceof TUnknown) && !returnType.isAssignableFrom(actualReturnType)) {
            typeChecker.pushError(TYPE_MISMATCH(actualReturnType, returnType.toString()), module.path, this.returnType.locations.self);
        }
        return type;
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

export class Param extends ASTNode implements TypedNode {
    name: string;
    typeNode: Type;

    getType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.type || (this.type = this.resolveType(typeChecker, module, context));
    }

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.typeNode.getType(typeChecker, module, context);
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
