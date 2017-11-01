import { ASTNode, CSTNode } from '../Node';


export abstract class Statement extends ASTNode {}

export class STStatement extends CSTNode<Statement> {
    choice: STStatement;

    reduce(): Statement {
        return this.choice.reduce();
    }
}
