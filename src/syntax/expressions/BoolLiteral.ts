import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token } from '~/parser/Tokenizer';
import { IdentifierExpression } from '~/syntax/expressions/IdentifierExpression';


@nonTerminal({ implements: Expression, before: [IdentifierExpression] })
export class BoolLiteral extends Expression {
    @parser(['true', 'false'], { definite: true })
    setValue(token: Token) {
        this.value = token.image === 'true';
        this.registerLocation('self', token.getLocation());
    }

    value: boolean;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitBoolLiteral(this);
    }
}
