import INodeVisitor from '~/syntax/INodeVisitor';
import { Statement } from '~/syntax/statements/Statement';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token, TokenType } from '~/parser/Tokenizer';
import { Expression } from '~/syntax/expressions/Expression';


@nonTerminal({ implements: Statement })
export class WhileStatement extends Statement {
    @parser('while', { definite: true })
    setWhileToken(token: Token) {
        this.registerLocation('while', token.getLocation());
    }

    @parser(TokenType.LPAREN, { err: 'WHILE_MISSING_OPEN_PAREN' }) setOpenParen() {}

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setCondition(exp: Expression) {
        this.conditionExp = exp;
    }

    @parser(TokenType.RPAREN, { err: 'WHILE_MISSING_CLOSE_PAREN' }) setCloseParen() {}

    @parser(Statement, { err: 'INVALID_STATEMENT' })
    setBody(stmt: Statement) {
        this.body = stmt;
        this.createAndRegisterLocation('self', this.locations.while, stmt.locations.self);
    }

    conditionExp: Expression;
    body: Statement;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitWhileStatement(this);
    }
}
