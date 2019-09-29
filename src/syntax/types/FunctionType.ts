import { seq, tok, ParseFunc, repeat } from '~/parser/parser';
import { Type, NodeBase, SyntaxType } from '~/syntax/environment';
import { FileRange } from '~/core';


export class FunctionType extends NodeBase<SyntaxType.FunctionType> {
    constructor(
        location: FileRange,
        readonly paramTypes: Type[],
        readonly returnType: Type
    ) { super(location, SyntaxType.FunctionType) }

    accept<P, R = P>(visitor: FunctionTypeVisitor<P, R>, param: P) {
        return visitor.visitFunctionType(this, param);
    }
}

export interface FunctionTypeVisitor<P, R = P> {
    visitFunctionType(node: FunctionType, param: P): R;
}

export function register(parseType: ParseFunc<Type>) {
    const parseFunctionType: ParseFunc<FunctionType> = seq(
        tok('('),
        repeat(parseType, '*', tok(',')),
        tok(')'),
        tok('=>'),
        parseType,
        ([_1, paramTypes, _2, _3, returnType], location) => new FunctionType(location, paramTypes, returnType)
    );

    return { parseFunctionType };
}
