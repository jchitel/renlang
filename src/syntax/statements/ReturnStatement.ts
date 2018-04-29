import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { ParseFunc, seq, tok, optional } from '~/parser/parser';


export interface ReturnStatement extends NodeBase<SyntaxType.ReturnStatement> {
    exp: Optional<Expression>;
}

export function register(Expression: ParseFunc<Expression>) {
    const ReturnStatement: ParseFunc<ReturnStatement> = seq(
        tok('return'),
        optional(Expression),
        ([_, exp], location) => ({
            syntaxType: SyntaxType.ReturnStatement as SyntaxType.ReturnStatement,
            location,
            exp
        })
    );

    return { ReturnStatement };
}
