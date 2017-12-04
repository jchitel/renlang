import { Statement } from '~/syntax/statements/Statement';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token, TokenType } from '~/parser/Tokenizer';
import { Expression } from '~/syntax/expressions/Expression';


@nonTerminal({ implements: Statement })
export class ForStatement extends Statement {
    @parser('for', { definite: true })
    setForToken(token: Token) {
        this.registerLocation('for', token.getLocation());
    }

    @parser(TokenType.LPAREN, { err: 'FOR_MISSING_OPEN_PAREN' }) setOpenParen() {}

    @parser(TokenType.IDENT, { err: 'FOR_INVALID_ITER_IDENT' })
    setIterVar(token: Token) {
        this.iterVar = token.image;
        this.registerLocation('iterVar', token.getLocation());
    }

    @parser('in', { err: 'FOR_MISSING_IN' }) setIn() {}

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setIterable(exp: Expression) {
        this.iterableExp = exp;
    }

    @parser(TokenType.RPAREN, { err: 'FOR_MISSING_CLOSE_PAREN' }) setCloseParen() {}

    @parser(Statement, { err: 'INVALID_STATEMENT' })
    setBody(stmt: Statement) {
        this.body = stmt;
        this.createAndRegisterLocation('self', this.locations.for, stmt.locations.self);
    }

    iterVar: string;
    iterableExp: Expression;
    body: Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitForStatement(this);
    }
}
