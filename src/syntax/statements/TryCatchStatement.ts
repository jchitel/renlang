import { NodeBase, SyntaxType, Statement } from '~/syntax/environment';
import { Param } from '~/syntax';
import { ParseFunc, seq, tok, repeat, optional } from '~/parser/parser';


interface Catch {
    param: Param;
    body: Statement;
}

export interface TryCatchStatement extends NodeBase<SyntaxType.TryCatchStatement> {
    try: Statement;
    catches: ReadonlyArray<Catch>;
    finally: Optional<Statement>;
}

export function register(Statement: ParseFunc<Statement>, Param: ParseFunc<Param>) {
    const CatchClause: ParseFunc<Catch> = seq(
        tok('catch'),
        tok('('),
        Param,
        tok(')'),
        Statement,
        ([_1, _2, param, _3, body]) => ({ param, body })
    );

    const FinallyClause: ParseFunc<Statement> = seq(
        tok('finally'),
        Statement,
        ([_, body]) => body
    );

    const TryCatchStatement: ParseFunc<TryCatchStatement> = seq(
        tok('try'),
        Statement,
        repeat(CatchClause, '+'),
        optional(FinallyClause),
        ([_, _try, catches, _finally], location) => ({
            syntaxType: SyntaxType.TryCatchStatement as SyntaxType.TryCatchStatement,
            location,
            try: _try,
            catches,
            finally: _finally
        })
    );

    return { TryCatchStatement };
}
