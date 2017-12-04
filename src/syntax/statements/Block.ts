import { Statement } from '~/syntax/statements/Statement';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';
import INodeVisitor from '~/syntax/INodeVisitor';
import { ExpressionStatement } from '~/syntax/statements/ExpressionStatement';


@nonTerminal({ implements: Statement, before: [ExpressionStatement] })
export class Block extends Statement {
    @parser(TokenType.LBRACE, { definite: true })
    setOpenBrace(token: Token) {
        this.registerLocation('openBrace', token.getLocation());
    }

    @parser(Statement, { repeat: '*' })
    setStatements(statements: Statement[]) {
        this.statements = statements;
    }

    @parser(TokenType.RBRACE, { err: 'MISSING_CLOSE_BRACE' })
    setCloseBrace(token: Token) {
        this.createAndRegisterLocation('self', this.locations.openBrace, token.getLocation());
    }

    statements: Statement[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBlock(this);
    }
}
