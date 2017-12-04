import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token, TokenType } from '~/parser/Tokenizer';


@nonTerminal({ implements: Expression })
export class IdentifierExpression extends Expression {
    @parser(TokenType.IDENT, { definite: true })
    setName(token: Token) {
        this.name = token.image;
        this.registerLocation('self', token.getLocation());
    }

    name: string;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitIdentifierExpression(this);
    }
}
