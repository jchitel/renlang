import { Type } from '~/syntax/types/Type';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';
import { TupleType } from '~/syntax/types/TupleType';


@nonTerminal({ implements: Type, before: [TupleType] })
export class ParenthesizedType extends Type {
    @parser(TokenType.LPAREN)
    setOpenParen(token: Token) {
        this.registerLocation('openParen', token.getLocation());
    }

    @parser(Type)
    setInnerType(type: Type) {
        this.inner = type;
    }

    @parser(TokenType.RPAREN, { definite: true })
    setCloseParen(token: Token){
        this.createAndRegisterLocation('self', this.locations.openParen, token.getLocation());
    }

    inner: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitParenthesizedType(this);
    }
}