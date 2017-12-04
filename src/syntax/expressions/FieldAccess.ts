import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


@nonTerminal({ implements: Expression, leftRecursive: 'setTarget' })
export class FieldAccess extends Expression {
    setTarget(exp: Expression) {
        this.target = exp;
    }

    @parser(TokenType.DOT, { definite: true }) setDot() {}

    @parser(TokenType.IDENT, { err: 'FIELD_ACCESS_INVALID_FIELD_NAME' })
    setField(token: Token) {
        this.field = token.image;
        this.registerLocation('field', token.getLocation());
        this.createAndRegisterLocation('self', this.target.locations.self, token.getLocation());
    }

    target: Expression;
    field: string;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFieldAccess(this);
    }
}
