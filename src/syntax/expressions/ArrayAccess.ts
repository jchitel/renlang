import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface ArrayAccess extends NodeBase<SyntaxType.ArrayAccess> {
    target: Expression;
    index: Expression;
}

export interface ArrayAccessSuffix extends NodeBase<SyntaxType.ArrayAccess> {
    index: Expression;
    setBase(target: Expression): ArrayAccess;
}

export function register(Expression: ParseFunc<Expression>) {
    const ArrayAccessSuffix: ParseFunc<ArrayAccessSuffix> = seq(
        tok('['),
        Expression,
        tok(']'),
        ([_1, index, _2], location) => ({
            syntaxType: SyntaxType.ArrayAccess as SyntaxType.ArrayAccess,
            location,
            index,
            setBase(target: Expression) {
                return {
                    ...this,
                    target,
                    location: this.location.merge(target.location)
                }
            }
        })
    );

    return { ArrayAccessSuffix };
}
