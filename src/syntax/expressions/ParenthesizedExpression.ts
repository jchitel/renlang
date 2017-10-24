import { Expression, STExpression } from './Expression';
import { TypedNode, TranslatableNode } from '../Node';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { Token } from '../../parser/Tokenizer';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';


export class ParenthesizedExpression extends Expression implements TypedNode, TranslatableNode {
    inner: Expression;
    
    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.inner.getType(typeChecker, module, context);
    }

    translate(translator: Translator, func: Func) {
        return this.inner.translate(translator, func);
    }
}

export class STParenthesizedExpression extends STExpression {
    openParenToken: Token;
    inner: STExpression;
    closeParenToken: Token;

    reduce() {
        const node = new ParenthesizedExpression();
        node.inner = this.inner.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}
