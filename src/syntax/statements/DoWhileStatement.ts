import { Statement } from '~/syntax/statements/Statement';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token, TokenType } from '~/parser/Tokenizer';
import { Expression } from '~/syntax/expressions/Expression';


@nonTerminal({ implements: Statement })
export class DoWhileStatement extends Statement {
    @parser('do', { definite: true })
    setDoToken(token: Token) {
        this.registerLocation('do', token.getLocation());
    }

    @parser(Statement, { err: 'INVALID_STATEMENT' })
    setBody(stmt: Statement) {
        this.body = stmt;
    }

    @parser('while', { err: 'DO_WHILE_MISSING_WHILE' }) setWhileToken() {}
    @parser(TokenType.LPAREN, { err: 'WHILE_MISSING_OPEN_PAREN' }) setOpenParen() {}

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setCondition(exp: Expression) {
        this.conditionExp = exp;
    }

    @parser(TokenType.RPAREN, { err: 'WHILE_MISSING_CLOSE_PAREN' })
    setCloseParen(token: Token) {
        this.createAndRegisterLocation('self', this.locations.do, token.getLocation());
    }

    body: Statement;
    conditionExp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitDoWhileStatement(this);
    }
}
