import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


@nonTerminal({ implements: Expression })
export class TupleLiteral extends Expression {
    @parser(TokenType.LPAREN, { definite: true })
    setOpenParen(token: Token) {
        this.registerLocation('openParen', token.getLocation());
    }

    @parser(Expression, { repeat: '*', err: 'INVALID_EXPRESSION', sep: TokenType.COMMA })
    setItems(items: Expression[]) {
        this.items = items;
    }

    @parser(TokenType.RPAREN)
    setCloseParen(token: Token) {
        this.createAndRegisterLocation('self', this.locations.openParen, token.getLocation());
    }

    items: Expression[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTupleLiteral(this);
    }
}
