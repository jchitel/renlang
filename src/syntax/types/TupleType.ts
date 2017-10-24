import { Type, STType } from './Type';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TUnknown, TTuple } from '../../typecheck/types';
import { Token } from '../../parser/Tokenizer';


export class TupleType extends Type {
    types: Type[];

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const types = this.types.map(t => t.getType(typeChecker, module, context));
        if (types.some(t => t instanceof TUnknown)) return new TUnknown();
        else return new TTuple(types);
    }
}

export class STTupleType extends STType {
    openParenToken: Token;
    types: STType[];
    closeParenToken: Token;

    reduce() {
        const node = new TupleType();
        node.types = this.types.map(t => t.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}
