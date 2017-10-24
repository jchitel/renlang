import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { Type, STType } from './Type';
import { Token } from '../../parser/Tokenizer';


export class ParenthesizedType extends Type {
    inner: Type;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.inner.getType(typeChecker, module, context);
    }
}

export class STParenthesizedType extends STType {
    openParenToken: Token;
    inner: STType;
    closeParenToken: Token;

    reduce() {
        const node = new ParenthesizedType();
        node.inner = this.inner.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}