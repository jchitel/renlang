import { Statement } from '~/syntax/statements/Statement';
import { nonTerminal, parser, ParseResult, exp } from '~/parser/Parser';
import INodeVisitor from '~/syntax/INodeVisitor';
import { Token } from '~/parser/Tokenizer';
import { Param } from '~/syntax/declarations/FunctionDeclaration';


export const CatchClause = {
    catch: exp('catch', { definite: true }),
    '(': exp('(', { err: 'TRY_CATCH_MISSING_OPEN_PAREN' }),
    param: exp(Param, { err: 'CATCH_INVALID_PARAM' }),
    ')': exp(')', { err: 'TRY_CATCH_MISSING_CLOSE_PAREN' }),
    body: exp(Statement, { err: 'INVALID_STATEMENT' })
}

export const FinallyClause = {
    finally: exp('finally', { definite: true }),
    body: exp(Statement, { err: 'INVALID_STATEMENT' })
};

type Catch = { param: Param, body: Statement };

@nonTerminal({ implements: Statement })
export class TryCatchStatement extends Statement {
    @parser('try', { definite: true })
    setTryToken(token: Token) {
        this.registerLocation('try', token.getLocation());
    }

    @parser(Statement, { err: 'INVALID_STATEMENT' })
    setTryBody(stmt: Statement) {
        this.try = stmt;
    }

    @parser(CatchClause, { repeat: '+', err: 'TRY_CATCH_MISSING_CATCH' })
    setCatches(result: ParseResult[]) {
        this.catches = result.map(c => ({
            param: c.param as Param,
            body: c.body as Statement,
        }))
    }

    @parser(FinallyClause, { optional: true })
    setFinally(result: ParseResult) {
        this.finally = result.body as Statement;
        this.createAndRegisterLocation('self', this.locations.try, this.finally.locations.self);
    }

    try: Statement;
    catches: Catch[];
    finally?: Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTryCatchStatement(this);
    }
}