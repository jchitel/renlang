import { NodeBase, SyntaxType, TypeNode } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface ArrayType extends NodeBase<SyntaxType.ArrayType> {
    baseType: TypeNode;
}

export interface ArrayTypeSuffix extends NodeBase<SyntaxType.ArrayType> {
    setBase(baseType: TypeNode): ArrayType;
}

export const ArrayTypeSuffix: ParseFunc<ArrayTypeSuffix> = seq(
    tok('['),
    tok(']'),
    ([_1, _2], location) => ({
        syntaxType: SyntaxType.ArrayType as SyntaxType.ArrayType,
        location,
        setBase(baseType: TypeNode) {
            return {
                ...this,
                baseType,
                location: this.location.merge(baseType.location)
            }
        }
    })
);
