import { STType, Type } from './Type';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TArray, TUnknown } from '../../typecheck/types';



export class ArrayType extends Type {
    baseType: Type;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const baseType = this.baseType.getType(typeChecker, module, context);
        if (baseType instanceof TUnknown) return new TUnknown();
        else return new TArray(baseType);
    }
}

export class STArrayType extends STType {
    baseType: STType;
    openBracketToken: Token;
    closeBracketToken: Token;

    reduce() {
        const node = new ArrayType();
        node.baseType = this.baseType.reduce();
        node.createAndRegisterLocation('self', node.baseType.locations.self, this.closeBracketToken.getLocation());
        return node;
    }
}