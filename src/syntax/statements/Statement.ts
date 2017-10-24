import { ASTNode, CSTNode, TypedNode, TranslatableNode } from '../Node';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TType } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';


export abstract class Statement extends ASTNode implements TypedNode, TranslatableNode {
    getType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.type || (this.type = this.resolveType(typeChecker, module, context));
    };

    abstract resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext): TType;

    abstract translate(translator: Translator, func: Func): void;
}

export class STStatement extends CSTNode<Statement> {
    choice: STStatement;

    reduce(): Statement {
        return this.choice.reduce();
    }
}
