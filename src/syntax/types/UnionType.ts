import { Type } from '~/syntax/types/Type';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';


@nonTerminal({ implements: Type, leftRecursive: 'setLeft' })
export class UnionType extends Type {
    setLeft(left: Type) {
        this.types = [left];
    }

    @parser('|', { definite: true }) setVbarToken() {}

    @parser(Type, { err: 'INVALID_UNION_TYPE' })
    setRight(right: Type) {
        if (right instanceof UnionType) this.types.push(...right.types);
        else this.types.push(right);
        this.createAndRegisterLocation('self', this.types[0].locations.self, this.types[this.types.length - 1].locations.self);
    }

    types: Type[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitUnionType(this);
    }
}
