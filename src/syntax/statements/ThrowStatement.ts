import { Statement } from '~/syntax/statements/Statement';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token } from '~/parser/Tokenizer';
import { Expression } from '~/syntax/expressions/Expression';


@nonTerminal({ implements: Statement })
export class ThrowStatement extends Statement {
    @parser('throw', { definite: true })
    setThrowToken(token: Token) {
        this.registerLocation('throw', token.getLocation());
    }

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setExpression(exp: Expression) {
        this.exp = exp;
        this.createAndRegisterLocation('self', this.locations.throw, exp.locations.self);
    }

    exp: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitThrowStatement(this);
    }
}
