import { ParseFunc, tok, select, seq } from '~/parser/parser';
import { NodeBase, SyntaxType } from '~/syntax/environment';
import { Token } from '~/parser/lexer';


export interface BuiltInType extends NodeBase<SyntaxType.BuiltInType> {
    name: Token;
}

export const BuiltInType: ParseFunc<BuiltInType> = seq(select(
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
), (name, location) => ({
    location,
    syntaxType: SyntaxType.BuiltInType as SyntaxType.BuiltInType,
    name
}));
