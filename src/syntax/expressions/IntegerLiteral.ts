import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


@nonTerminal({ implements: Expression })
export class IntegerLiteral extends Expression {
    @parser(TokenType.INTEGER_LITERAL, { definite: true })
    setValue(token: Token) {
        this.value = token.value;
        this.registerLocation('self', token.getLocation());
    }

    value: number;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitIntegerLiteral(this);
    }
}
