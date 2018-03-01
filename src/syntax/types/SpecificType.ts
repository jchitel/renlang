import { NodeBase, SyntaxType, TypeNode } from '~/syntax/environment';
import { ParseFunc, seq, repeat, tok } from '~/parser/parser';


export interface SpecificType extends NodeBase {
    syntaxType: SyntaxType.SpecificType;
    typeNode: TypeNode;
    typeArgs: ReadonlyArray<TypeNode>;
}

export interface SpecificTypeSuffix extends NodeBase {
    syntaxType: SyntaxType.SpecificType;
    typeArgs: ReadonlyArray<TypeNode>;
    setBase(typeNode: TypeNode): SpecificType;
}

export function register(TypeNode: ParseFunc<TypeNode>) {
    const TypeArgList: ParseFunc<TypeNode[]> = seq(
        tok('<'),
        repeat(TypeNode, '*', tok(',')),
        tok('>'),
        ([_1, types, _2]) => types
    );

    const SpecificTypeSuffix: ParseFunc<SpecificTypeSuffix> = seq(
        TypeArgList,
        (typeArgs, location) => ({
            syntaxType: SyntaxType.SpecificType as SyntaxType.SpecificType,
            location,
            typeArgs,
            setBase(typeNode: TypeNode) {
                return {
                    ...this,
                    typeNode,
                    location: this.location.merge(typeNode.location)
                }
            }
        })
    );

    return { SpecificTypeSuffix, TypeArgList };
}
