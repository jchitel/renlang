import { Type } from '~/syntax/types/Type';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, ParseResult, parser, exp } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';


export const TypeArgList = {
    '<': exp('<', { definite: true }),
    types: exp(Type, { repeat: '*', sep: TokenType.COMMA, err: 'INVALID_TYPE_ARG' }),
    '>': exp('>', { err: 'INVALID_TYPE_ARG_LIST' })
}

@nonTerminal({ implements: Type, leftRecursive: 'setGenericType' })
export class SpecificType extends Type {
    setGenericType(type: Type) {
        this.typeNode = type;
    }

    @parser(TypeArgList, { definite: true })
    setTypeArgs(result: ParseResult) {
        this.typeArgs = result.types as Type[];
        this.createAndRegisterLocation('self', this.typeNode.locations.self, (result['>'] as Token).getLocation());
    }

    typeNode: Type;
    typeArgs: Type[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitSpecificType(this);
    }
}