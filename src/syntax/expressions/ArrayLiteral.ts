import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token, TokenType } from '~/parser/Tokenizer';


@nonTerminal({ implements: Expression })
export class ArrayLiteral extends Expression {
    @parser(TokenType.LBRACK, { definite: true })
    setOpenBracket(token: Token) {
        this.registerLocation('openBracket', token.getLocation());
    }

    @parser(Expression, { repeat: '*', err: 'INVALID_EXPRESSION', sep: TokenType.COMMA })
    setItems(items: Expression[]) {
        this.items = items;
    }

    @parser(TokenType.RBRACK)
    setCloseBracket(token: Token) {
        this.createAndRegisterLocation('self', this.locations.openBracket, token.getLocation());
    }

    items: Expression[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitArrayLiteral(this);
    }
}
