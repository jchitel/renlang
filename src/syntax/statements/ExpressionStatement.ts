import { Statement } from '~/syntax/statements/Statement';
import { parser, nonTerminal } from '~/parser/Parser';
import INodeVisitor from '~/syntax/INodeVisitor';
import { Expression } from '~/syntax/expressions/Expression';


@nonTerminal({ implements: Statement })
export class ExpressionStatement extends Statement {
    @parser(Expression, { definite: true })
    setExpression(exp: Expression) {
        this.expression = exp;
    }

    expression: Expression;

    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitExpressionStatement(this);
    }
}
