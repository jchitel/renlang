import { Type } from './Type';
import { Token } from '~/parser/Tokenizer';
import INodeVisitor from '~/syntax/INodeVisitor';
import { parser, nonTerminal } from '~/parser/Parser';
import { IdentifierType } from '~/syntax/types/IdentifierType';


export const builtInTypes = [
    'u8', 'i8', 'byte',
    'u16', 'i16', 'short',
    'u32', 'i32', 'integer',
    'u64', 'i64', 'long',
    'int',
    'f32', 'float',
    'f64', 'double',
    'string',
    'char',
    'bool',
    'void',
    'any',
];

@nonTerminal({ implements: Type, before: [IdentifierType] })
export class BuiltInType extends Type {
    @parser(builtInTypes, { definite: true })
    setType(token: Token) {
        this.typeNode = token.image;
        this.registerLocation('self', token.getLocation());
    }

    typeNode: string;

    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitBuiltInType(this);
    }
}
