import { Type } from '~/syntax/types/Type';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token, TokenType } from '~/parser/Tokenizer';


@nonTerminal({ implements: Type })
export class TupleType extends Type {
    @parser(TokenType.LPAREN, { definite: true })
    setOpenParen(token: Token) {
        this.registerLocation('openParen', token.getLocation());
    }

    @parser(Type, { repeat: '*', sep: TokenType.COMMA })
    setTypes(types: Type[]) {
        this.types = types;
    }

    @parser(TokenType.RPAREN)
    setCloseParen(token: Token) {
        this.createAndRegisterLocation('self', this.locations.openParen, token.getLocation());
    }

    types: Type[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitTupleType(this);
    }
}
