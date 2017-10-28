import { ASTNode, CSTNode, TypedNode } from '../Node';
import { Expression, STExpression } from './Expression';
import { Param, STParam } from '../declarations';
import { Statement, STStatement } from '../statements';
import { Token } from '../../parser/Tokenizer';
import { TFunction, TUnknown } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TYPE_MISMATCH } from '../../typecheck/TypeCheckerMessages';


export class LambdaExpression extends Expression {
    params: (Param | LambdaParam)[];
    body: Expression | Statement;
    type: TFunction;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const paramTypes = this.params.map(p => p.getType(typeChecker, module, context));
        // can't infer return type, that will happen when we are checking types
        return new TFunction(paramTypes, new TUnknown()); // TODO we can't do this
    }

    /**
     * Once the type of the lambda has been inferred and filled in,
     * we need to do resolution on the body.
     */
    completeResolution(typeChecker: TypeChecker, module: Module) {
        // create a new context for this function
        const context = new TypeCheckContext();
        for (let i = 0; i < this.params.length; ++i) {
            context.symbolTable[this.params[i].name] = this.type.paramTypes[i];
        }
        // type check the function body, passing along the starting symbol table
        const actualReturnType = this.body.getType(typeChecker, module, context);
        if (!this.type.returnType.isAssignableFrom(actualReturnType))
            typeChecker.pushError(TYPE_MISMATCH(actualReturnType, this.type.returnType.toString()), module.path, this.locations.self);
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, ref => translator.lambda(this, ref, func.moduleId));
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

export class LambdaParam extends ASTNode implements TypedNode {
    name: string;

    getType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.type || (this.type = this.resolveType(typeChecker, module, context));
    }

    resolveType(_typeChecker: TypeChecker, _module: Module, _context: TypeCheckContext) {
        // if the type isn't explicit, we can't infer it, that will happen during type checking
        return new TUnknown(); // TODO: we need something else here
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
