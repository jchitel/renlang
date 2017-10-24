import { CSTNode, ASTNode, TypedNode } from '../Node';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TType } from '../../typecheck/types';
import { PrimitiveType } from './PrimitiveType';
import { IdentifierType } from './IdentifierType';


export abstract class Type extends ASTNode implements TypedNode {
    getType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.type || (this.type = this.resolveType(typeChecker, module, context));
    }

    abstract resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext): TType;
}

export class STType extends CSTNode<Type> {
    choice: Token | STType;

    reduce(): Type {
        if (this.choice instanceof Token) {
            if (this.choice.type === 'IDENT') {
                return new IdentifierType(this.choice.image, this.choice.getLocation());
            } else {
                return new PrimitiveType(this.choice.image, this.choice.getLocation());
            }
        } else {
            return this.choice.reduce();
        }
    }
}