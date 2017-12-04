import { Type } from '~/syntax/types/Type';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


@nonTerminal({ implements: Type, leftRecursive: 'setBaseType' })
export class NamespaceAccessType extends Type {
    setBaseType(type: Type) {
        this.baseType = type;
    }

    @parser(TokenType.DOT, { definite: true }) setDot() {}

    @parser(TokenType.IDENT)
    setTypeName(token: Token) {
        this.typeName = token.image;
        this.createAndRegisterLocation('self', this.baseType.locations.self, token.getLocation());
    }

    baseType: Type;
    typeName: string;

    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitNamespaceAccessType(this);
    }
}