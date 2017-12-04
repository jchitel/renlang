import { Type } from './Type';
import INodeVisitor from '~/syntax/INodeVisitor';
import { TokenType, Token } from '~/parser/Tokenizer';
import { parser, nonTerminal } from '~/parser/Parser';


@nonTerminal({ implements: Type })
export class IdentifierType extends Type {
    @parser(TokenType.IDENT, { definite: true })
    setIdentifier(token: Token) {
        this.name = token.image;
        this.registerLocation('self', token.getLocation());
    }

    name: string;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitIdentifierType(this);
    }
}