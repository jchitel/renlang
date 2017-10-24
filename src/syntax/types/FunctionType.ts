import { Type, STType } from './Type';
import { TUnknown, TFunction } from '../../typecheck/types';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';


export class FunctionType extends Type {
    paramTypes: Type[];
    returnType: Type;

    /**
     * TODO: does it make sense for explicit function types to have type params?
     * If so, the syntax will have to be extended to allow for that...
     */
    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const paramTypes = this.paramTypes.map(t => t.getType(typeChecker, module, context));
        const returnType = this.returnType.getType(typeChecker, module, context);
        if (paramTypes.some(t => t instanceof TUnknown) || returnType instanceof TUnknown) return new TUnknown();
        else return new TFunction(paramTypes, returnType);
    }
}

export class STFunctionType extends STType {
    openParenToken: Token;
    paramTypes: STType[];
    closeParenToken: Token;
    fatArrowToken: Token;
    returnType: STType;

    reduce() {
        const node = new FunctionType();
        node.paramTypes = this.paramTypes.map(t => t.reduce());
        node.returnType = this.returnType.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), node.returnType.locations.self);
        return node;
    }
}
