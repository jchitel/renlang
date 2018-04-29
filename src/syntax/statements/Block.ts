import { NodeBase, SyntaxType, Statement } from '~/syntax/environment';
import { ParseFunc, seq, tok, repeat } from '~/parser/parser';


export interface Block extends NodeBase<SyntaxType.Block> {
    statements: ReadonlyArray<Statement>;
}

export function register(Statement: ParseFunc<Statement>) {
    const Block: ParseFunc<Block> = seq(
        tok('{'),
        repeat(Statement, '*'),
        tok('}'),
        ([_1, statements, _2], location) => ({
            syntaxType: SyntaxType.Block as SyntaxType.Block,
            location,
            statements
        })
    );

    return { Block };
}
