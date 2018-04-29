import { seq, tok, ParseFunc, repeat } from '~/parser/parser';
import { TypeNode, NodeBase, SyntaxType } from '~/syntax/environment';


export interface FunctionType extends NodeBase<SyntaxType.FunctionType> {
    paramTypes: TypeNode[];
    returnType: TypeNode;
}

export function register(TypeNode: ParseFunc<TypeNode>) {
    const FunctionType: ParseFunc<FunctionType> = seq(
        tok('('),
        repeat(TypeNode, '*', tok(',')),
        tok(')'),
        tok('=>'),
        TypeNode,
        ([_1, paramTypes, _2, _3, returnType], location) => ({
            syntaxType: SyntaxType.FunctionType as SyntaxType.FunctionType,
            location,
            paramTypes,
            returnType
        })
    );

    return { FunctionType };
}
