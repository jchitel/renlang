import { NodeBase, SyntaxType, TypeNode } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface UnionType extends NodeBase<SyntaxType.UnionType> {
    left: TypeNode;
    right: TypeNode;
}

export interface UnionTypeSuffix extends NodeBase<SyntaxType.UnionType> {
    right: TypeNode;
    setBase(left: TypeNode): UnionType;
}

export function register(TypeNode: ParseFunc<TypeNode>) {
    const UnionTypeSuffix: ParseFunc<UnionTypeSuffix> = seq(
        tok('|'),
        TypeNode,
        ([_1, right], location) => ({
            syntaxType: SyntaxType.UnionType as SyntaxType.UnionType,
            location,
            right,
            setBase(left: TypeNode) {
                return {
                    ...this,
                    left,
                    location: this.location.merge(left.location)
                }; 
            }
        })
    );

    return { UnionTypeSuffix };
}
