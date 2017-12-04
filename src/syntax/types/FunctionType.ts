import INodeVisitor from '~/syntax/INodeVisitor';
import { Type } from '~/syntax/types/Type';
import { nonTerminal, parser } from '~/parser/Parser';
import { IdentifierType } from '~/syntax/types/IdentifierType';
import { TokenType, Token } from '~/parser/Tokenizer';
import { ParenthesizedType } from '~/syntax/types/ParenthesizedType';
import { TupleType } from '~/syntax/types/TupleType';


@nonTerminal({ implements: Type, before: [IdentifierType, ParenthesizedType, TupleType] })
export class FunctionType extends Type {
    @parser(TokenType.LPAREN)
    setOpenParen(token: Token) {
        this.registerLocation('openParen', token.getLocation());
    }

    @parser(Type, { repeat: '*', err: 'INVALID_TYPE', sep: TokenType.COMMA })
    setParamTypes(types: Type[]) {
        this.paramTypes = types;
    }

    @parser(TokenType.RPAREN) setCloseParen() {}
    @parser(TokenType.FAT_ARROW, { definite: true }) setFatArrow() {}

    @parser(Type, { err: 'FUNCTION_TYPE_INVALID_RETURN_TYPE' })
    setReturnType(type: Type) {
        this.returnType = type;
        this.createAndRegisterLocation('self', this.locations.openParen, type.locations.self);
    }

    paramTypes: Type[];
    returnType: Type;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFunctionType(this);
    }
}
