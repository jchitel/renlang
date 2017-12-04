import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


@nonTerminal({ implements: Expression })
export class CharLiteral extends Expression {
    @parser(TokenType.CHARACTER_LITERAL, { definite: true })
    setValue(token: Token) {
        this.value = token.value;
        this.registerLocation('self', token.getLocation());
    }

    value: string;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitCharLiteral(this);
    }
}
