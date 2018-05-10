import { NodeBase, SyntaxType, Statement } from '~/syntax/environment';
import { Param } from '~/syntax';
import { ParseFunc, seq, tok, repeat, optional } from '~/parser/parser';
import { FileRange } from '~/core';


interface Catch {
    param: Param;
    body: Statement;
}

export class TryCatchStatement extends NodeBase<SyntaxType.TryCatchStatement> {
    constructor(
        location: FileRange,
        readonly _try: Statement,
        readonly catches: ReadonlyArray<Catch>,
        readonly _finally: Optional<Statement>
    ) { super(location, SyntaxType.TryCatchStatement) }

    accept<P, R = P>(visitor: TryCatchStatementVisitor<P, R>, param: P) {
        return visitor.visitTryCatchStatement(this, param);
    }
}

export interface TryCatchStatementVisitor<P, R = P> {
    visitTryCatchStatement(node: TryCatchStatement, param: P): R;
}

export function register(parseStatement: ParseFunc<Statement>, parseParam: ParseFunc<Param>) {
    const parseCatchClause: ParseFunc<Catch> = seq(
        tok('catch'),
        tok('('),
        parseParam,
        tok(')'),
        parseStatement,
        ([_1, _2, param, _3, body]) => ({ param, body })
    );

    const parseFinallyClause: ParseFunc<Statement> = seq(
        tok('finally'),
        parseStatement,
        ([_, body]) => body
    );

    const parseTryCatchStatement: ParseFunc<TryCatchStatement> = seq(
        tok('try'),
        parseStatement,
        repeat(parseCatchClause, '+'),
        optional(parseFinallyClause),
        ([_, _try, catches, _finally], location) => new TryCatchStatement(location, _try, catches, _finally)
    );

    return { parseTryCatchStatement };
}
