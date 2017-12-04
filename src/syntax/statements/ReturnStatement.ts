import { Statement } from '~/syntax/statements/Statement';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token } from '~/parser/Tokenizer';
import { Expression } from '~/syntax/expressions/Expression';


@nonTerminal({ implements: Statement })
export class ReturnStatement extends Statement {
    @parser('return', { definite: true })
    setReturnToken(token: Token) {
        this.registerLocation('self', token.getLocation());
    }

    @parser(Expression, { optional: true })
    setExpression(exp: Expression) {
        this.exp = exp;
        this.createAndRegisterLocation('self', this.locations.self, exp.locations.self);
    }

    exp?: Expression;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitReturnStatement(this);
    }
}
