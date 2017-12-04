import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, exp, parser, ParseResult } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


export const StructEntry = {
    key: exp(TokenType.IDENT, { definite: true }),
    ':': exp(TokenType.COLON, { err: 'STRUCT_LITERAL_MISSING_COLON' }),
    value: exp(Expression, { err: 'INVALID_EXPRESSION' }),
};

@nonTerminal({ implements: Expression })
export class StructLiteral extends Expression {
    @parser(TokenType.LBRACE, { definite: true })
    setOpenBrace(token: Token) {
        this.registerLocation('openBrace', token.getLocation());
    }

    @parser(StructEntry, { repeat: '*', sep: TokenType.COMMA })
    setEntries(result: ParseResult[]) {
        this.entries = result.map(e => {
            const key = e.key as Token;
            this.registerLocation(`key_${key.image}`, key.getLocation());
            return { key: key.image, value: e.value as Expression };
        });
    }

    @parser(TokenType.RBRACE)
    setCloseBrace(token: Token) {
        this.createAndRegisterLocation('self', this.locations.openBrace, token.getLocation());
    }

    entries: { key: string, value: Expression }[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitStructLiteral(this);
    }
}
