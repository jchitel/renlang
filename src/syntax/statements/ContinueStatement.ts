import { Statement, STStatement } from './Statement';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class ContinueStatement extends Statement {
    loopNumber: number;
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitContinueStatement(this);
    }
}

export class STContinueStatement extends STStatement {
    continueToken: Token;
    loopNumber?: Token;

    reduce() {
        const node = new ContinueStatement();
        if (this.loopNumber) {
            node.loopNumber = this.loopNumber.value;
            node.createAndRegisterLocation('self', this.continueToken.getLocation(), this.loopNumber.getLocation());
        } else {
            node.loopNumber = 0;
            node.registerLocation('self', this.continueToken.getLocation());
        }
        return node;
    }
}