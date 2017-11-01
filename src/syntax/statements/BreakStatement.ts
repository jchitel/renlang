import { Statement, STStatement } from './Statement';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class BreakStatement extends Statement {
    loopNumber: number;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBreakStatement(this);
    }
}

export class STBreakStatement extends STStatement {
    breakToken: Token;
    loopNumber?: Token;

    reduce() {
        const node = new BreakStatement();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.breakToken.getLocation(), this.loopNumber.getLocation());
        } else {
            node.loopNumber = 0;
            node.registerLocation('self', this.breakToken.getLocation());
        }
        return node;
    }
}
