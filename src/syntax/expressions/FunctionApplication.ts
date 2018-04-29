import { NodeBase, SyntaxType, Expression, TypeNode } from '~/syntax/environment';
import { ParseFunc, seq, tok, optional, repeat } from '~/parser/parser';


export interface FunctionApplication extends NodeBase<SyntaxType.FunctionApplication> {
    target: Expression;
    typeArgs: TypeNode[];
    args: Expression[];
}

export interface FunctionApplicationSuffix extends NodeBase<SyntaxType.FunctionApplication> {
    typeArgs: TypeNode[];
    args: Expression[];
    setBase(target: Expression): FunctionApplication;
}

export function register(Expression: ParseFunc<Expression>, TypeArgList: ParseFunc<TypeNode[]>) {
    const FunctionApplicationSuffix: ParseFunc<FunctionApplicationSuffix> = seq(
        optional(TypeArgList),
        tok('('),
        repeat(Expression, '*', tok(',')),
        tok(')'),
        ([typeArgs, _1, args, _2], location) => ({
            syntaxType: SyntaxType.FunctionApplication as SyntaxType.FunctionApplication,
            location,
            typeArgs: typeArgs || [],
            args,
            setBase(target: Expression) {
                return {
                    ...this,
                    target,
                    location: this.location.merge(target.location)
                }
            }
        })
    );
    
    return { FunctionApplicationSuffix };
}
