import { CSTNode } from '../Node';
import { Expression, STExpression } from './Expression';
import { Token, ILocation } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


export class StructLiteral extends Expression {
    entries: { key: string, value: Expression }[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitStructLiteral(this);
    }
}

export class STStructLiteral extends STExpression {
    openBraceToken: Token;
    entries: STStructEntry[];
    closeBraceToken: Token;

    reduce() {
        const node = new StructLiteral();
        node.entries = [];
        for (const entry of this.entries) {
            const { key, value, loc } = entry.reduce();
            node.entries.push({ key, value });
            node.registerLocation(`key_${key}`, loc);
        }
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}

export class STStructEntry extends CSTNode<{ key: string, value: Expression, loc: ILocation }> {
    keyToken: Token;
    colonToken: Token;
    value: STExpression;

    reduce() {
        return {
            key: this.keyToken.image,
            value: this.value.reduce(),
            loc: this.keyToken.getLocation(),
        };
    }
}
