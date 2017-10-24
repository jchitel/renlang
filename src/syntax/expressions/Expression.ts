import { ASTNode, CSTNode, TypedNode, TranslatableNode } from '../Node';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TType } from '../../typecheck/types';
import { Token } from '../../parser/Tokenizer';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { IntegerLiteral } from './IntegerLiteral';
import { FloatLiteral } from './FloatLiteral';
import { CharLiteral } from './CharLiteral';
import { StringLiteral } from './StringLiteral';
import { BoolLiteral } from './BoolLiteral';
import { IdentifierExpression } from './IdentifierExpression';


export abstract class Expression extends ASTNode implements TypedNode, TranslatableNode {
    getType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.type || (this.type = this.resolveType(typeChecker, module, context));
    }

    /**
     * Forces a type resolution of this expression.
     * Do not call this directly, use getType() instead.
     */
    abstract resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext): TType;

    abstract translate(translator: Translator, func: Func): number;
}

export class STExpression extends CSTNode<Expression> {
    choice: Token | STExpression;

    reduce(): Expression {
        if (this.choice instanceof Token) {
            if (this.choice.type === 'INTEGER_LITERAL') {
                return new IntegerLiteral(this.choice.value as number, this.choice.getLocation());
            } else if (this.choice.type === 'FLOAT_LITERAL') {
                return new FloatLiteral(this.choice.value as number, this.choice.getLocation());
            } else if (this.choice.type === 'CHAR_LITERAL') {
                return new CharLiteral(this.choice.value as string, this.choice.getLocation());
            } else if (this.choice.type === 'STRING_LITERAL') {
                return new StringLiteral(this.choice.value as string, this.choice.getLocation());
            } else if (['TRUE', 'FALSE'].includes(this.choice.type)) {
                return new BoolLiteral(this.choice.image, this.choice.getLocation());
            } else {
                return new IdentifierExpression(this.choice.image, this.choice.getLocation());
            }
        } else {
            return this.choice.reduce();
        }
    }
}