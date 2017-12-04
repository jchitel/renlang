import { Type } from '~/syntax/types/Type';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser, exp, ParseResult } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


const Field = {
    typeNode: exp(Type, { definite: true }),
    name: exp(TokenType.IDENT, { err: 'INVALID_FIELD_NAME' }),
};

@nonTerminal({ implements: Type })
export class StructType extends Type {
    @parser(TokenType.LBRACE, { definite: true })
    setOpenBrace(token: Token) {
        this.registerLocation('openBrace', token.getLocation());
    }

    @parser(Field, { repeat: '*' })
    setFields(fields: ParseResult[]) {
        for (const field of fields) {
            const name = field.name as Token;
            this.fields.push({ type: field.typeNode as Type, name: name.image });
            this.registerLocation(`field_${name}`, name.getLocation());
        }
    }

    @parser(TokenType.RBRACE, { err: 'INVALID_STRUCT_NO_CLOSE_BRACE' })
    setCloseBrace(token: Token) {
        this.createAndRegisterLocation('self', this.locations.openBrace, token.getLocation());
    }

    fields: { type: Type, name: string }[] = [];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitStructType(this);
    }
}
