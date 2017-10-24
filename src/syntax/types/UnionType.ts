import { Type, STType } from './Type';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TUnion, TUnknown } from '../../typecheck/types';
import { Token } from '../../parser/Tokenizer';


export class UnionType extends Type {
    types: Type[];

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const types = this.types.map(t => t.getType(typeChecker, module, context));
        if (types.some(t => t instanceof TUnknown)) return new TUnknown();
        else return new TUnion(types);
    }
}

export class STUnionType extends STType {
    left: STType;
    vbarToken: Token;
    right: STType;

    reduce() {
        const node = new UnionType();
        // collapse the left and right types into a single list if they are union types
        const left = this.left.reduce();
        if (left instanceof UnionType) node.types = [...left.types];
        else node.types = [left];
        const right = this.right.reduce();
        if (right instanceof UnionType) node.types = [...node.types, ...right.types];
        else node.types.push(right);
        node.createAndRegisterLocation('self', left.locations.self, right.locations.self);
        return node;
    }
}
