import { Type } from '~/syntax/types/Type';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


@nonTerminal({ implements: Type, leftRecursive: 'setBaseType' })
export class ArrayType extends Type {
    setBaseType(baseType: Type) {
        this.baseType = baseType;
    }

    @parser(TokenType.LBRACK, { definite: true }) setOpenBracket() {}

    @parser(TokenType.RBRACK)
    setCloseBracket(token: Token) {
        this.createAndRegisterLocation('self', this.baseType.locations.self, token.getLocation());
    }

    baseType: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitArrayType(this);
    }
}
