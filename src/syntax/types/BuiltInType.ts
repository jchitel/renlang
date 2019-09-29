import { ParseFunc, tok, select, seq } from '~/parser/parser';
import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token } from '~/parser/lexer';
import { FileRange } from '~/core';


export class BuiltInType extends NodeBase<SyntaxType.BuiltInType> {
    constructor(
        location: FileRange,
        readonly name: Token
    ) { super(location, SyntaxType.BuiltInType) }

    accept<P, R = P>(visitor: BuiltInTypeVisitor<P, R>, param: P) {
        return visitor.visitBuiltInType(this, param);
    }
}

export interface BuiltInTypeVisitor<P, R = P> {
    visitBuiltInType(node: BuiltInType, param: P): R;
}

export const parseBuiltInType: ParseFunc<BuiltInType> = seq(select(
    tok('u8'), tok('i8'), tok('byte'),
    tok('u16'), tok('i16'), tok('short'),
    tok('u32'), tok('i32'), tok('integer'),
    tok('u64'), tok('i64'), tok('long'),
    tok('int'),
    tok('f32'), tok('float'),
    tok('f64'), tok('double'),
    tok('string'),
    tok('char'),
    tok('bool'),
    tok('void'),
    tok('any'),
    tok('never')
), (name, location) => new BuiltInType(location, name));
