import { NodeBase, SyntaxType, Statement } from '~/syntax/environment';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';
import { FileRange } from '~/core';


export class Block extends NodeBase<SyntaxType.Block> {
    constructor(
        location: FileRange,
        readonly statements: ReadonlyArray<Statement>
    ) { super(location, SyntaxType.Block) }

    accept<P, R = P>(visitor: BlockVisitor<P, R>, param: P) {
        return visitor.visitBlock(this, param);
    }
}

export interface BlockVisitor<P, R = P> {
    visitBlock(node: Block, param: P): R;
}

export function register(parseStatement: ParseFunc<Statement>) {
    const parseBlock: ParseFunc<Block> = seq(
        tok('{'),
        repeat(parseStatement, '*'),
        tok('}'),
        ([_1, statements, _2], location) => new Block(location, statements)
    );

    return { parseBlock };
}
