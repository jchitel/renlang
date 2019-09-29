import { NodeBase, SyntaxType, Expression, Type } from '~/syntax/environment';
import { ParseFunc, seq, tok, optional, repeat } from '~/parser/parser';
import { FileRange } from '~/core';


export class FunctionApplication extends NodeBase<SyntaxType.FunctionApplication> {
    constructor(
        location: FileRange,
        readonly target: Expression,
        readonly typeArgs: Optional<Type[]>,
        readonly args: Expression[]
    ) { super(location, SyntaxType.FunctionApplication) }

    accept<P, R = P>(visitor: FunctionApplicationVisitor<P, R>, param: P) {
        return visitor.visitFunctionApplication(this, param);
    }
}

export interface FunctionApplicationVisitor<P, R = P> {
    visitFunctionApplication(node: FunctionApplication, param: P): R;
}

export class FunctionApplicationSuffix extends NodeBase<SyntaxType.FunctionApplication> {
    constructor(
        location: FileRange,
        readonly typeArgs: Optional<Type[]>,
        readonly args: Expression[]
    ) { super(location, SyntaxType.FunctionApplication) }

    setBase = (target: Expression) => new FunctionApplication(this.location.merge(target.location), target, this.typeArgs, this.args);
}

export function register(parseExpression: ParseFunc<Expression>, parseTypeArgList: ParseFunc<Type[]>) {
    const parseFunctionApplicationSuffix: ParseFunc<FunctionApplicationSuffix> = seq(
        optional(parseTypeArgList),
        tok('('),
        repeat(parseExpression, '*', tok(',')),
        tok(')'),
        ([typeArgs, _1, args, _2], location) => new FunctionApplicationSuffix(location, typeArgs, args)
    );
    
    return { parseFunctionApplicationSuffix };
}
