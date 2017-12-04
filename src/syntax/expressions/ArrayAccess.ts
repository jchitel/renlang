import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


@nonTerminal({ implements: Expression, leftRecursive: 'setTarget' })
export class ArrayAccess extends Expression {
    setTarget(exp: Expression) {
        this.target = exp;
    }

    @parser(TokenType.LBRACK, { definite: true }) setOpenBracket() {}

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setIndexExp(exp: Expression) {
        this.indexExp = exp;
    }

    @parser(TokenType.RBRACK, { err: 'ARRAY_ACCESS_MISSING_CLOSE_BRACKET' })
    setCloseBracket(token: Token) {
        this.createAndRegisterLocation('self', this.target.locations.self, token.getLocation());
    }

    target: Expression;
    indexExp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitArrayAccess(this);
    }
}
