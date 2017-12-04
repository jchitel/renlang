import { Statement } from '~/syntax/statements/Statement';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser } from '~/parser/Parser';
import { Token, TokenType } from '~/parser/Tokenizer';


@nonTerminal({ implements: Statement })
export class BreakStatement extends Statement {
    @parser('break', { definite: true })
    setBreakToken(token: Token) {
        this.registerLocation('self', token.getLocation());
    }

    @parser(TokenType.INTEGER_LITERAL, { optional: true })
    setLoopNumber(token: Token) {
        this.loopNumber = token.value;
        this.createAndRegisterLocation('self', this.locations.self, token.getLocation());
    }

    loopNumber: number = 0;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBreakStatement(this);
    }
}
