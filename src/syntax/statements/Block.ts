import { Statement, STStatement } from './Statement';
import { Noop } from './Noop';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class Block extends Statement {
    statements: Statement[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBlock(this);
    }
}

export class STBlock extends STStatement {
    openBraceToken: Token;
    statements: STStatement[];
    closeBraceToken: Token;

    reduce() {
        const node = new Block();
        // filter out noops, because noops inside blocks mean nothing
        node.statements = this.statements.map(s => s.reduce()).filter(s => !(s instanceof Noop));
        // once all noops have been removed, if this is now empty, return a noop
        if (!node.statements.length) return new Noop(this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}
