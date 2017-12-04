import { Expression } from './Expression';
import INodeVisitor from '~/syntax/INodeVisitor';
import { nonTerminal, parser, ParseResult } from '~/parser/Parser';
import { TokenType, Token } from '~/parser/Tokenizer';
import { TypeArgList } from '~/syntax/types/SpecificType';
import { Type } from '~/syntax/types/Type';
import { BinaryExpression } from './BinaryExpression';
import { PostfixExpression } from './UnaryExpression';


@nonTerminal({ implements: Expression, leftRecursive: 'setTarget', before: [BinaryExpression, PostfixExpression] })
export class FunctionApplication extends Expression {
    setTarget(exp: Expression) {
        this.target = exp;
    }

    @parser(TypeArgList, { optional: true })
    setTypeArgs(result: ParseResult) {
        this.typeArgs = result.types as Type[];
    }

    @parser(TokenType.LPAREN, { definite: true }) setOpenParen() {}

    @parser(Expression, { repeat: '*', err: 'INVALID_EXPRESSION', sep: TokenType.COMMA })
    setArgs(args: Expression[]) {
        this.args = args;
    }

    @parser(TokenType.RPAREN)
    setCloseParen(token: Token) {
        this.createAndRegisterLocation('self', this.target.locations.self, token.getLocation());
    }

    target: Expression;
    typeArgs?: Type[];
    args: Expression[];
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitFunctionApplication(this);
    }
}
