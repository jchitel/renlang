import { Statement } from './Statement';
import { ILocation } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


/**
 * Represents a statement that does nothing, representable in code by {}.
 * Inside another block, this is effectively nothing, but this has semantic meaning as a function body or statement body.
 */
export class Noop extends Statement {
    constructor(startLoc: ILocation, endLoc: ILocation) {
        super();
        this.createAndRegisterLocation('self', startLoc, endLoc);
    }
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitNoop(this);
    }
}
