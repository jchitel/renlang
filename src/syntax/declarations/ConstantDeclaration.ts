import { Token, TokenType } from '~/parser/Tokenizer';
import INodeVisitor from '~/syntax/INodeVisitor';
import { parser, nonTerminal } from '~/parser/Parser';
import { Declaration } from './Program';
import { Expression } from '~/syntax/expressions/Expression';


/**
 * ConstantDeclaration ::= 'const' IDENT? EQUALS Expression
 */
@nonTerminal({ implements: Declaration })
export class ConstantDeclaration extends Declaration {
    @parser('const', { definite: true })
    setConstToken(token: Token) {
        this.registerLocation('self', token.getLocation());
    }

    @parser(TokenType.IDENT, { optional: true })
    setName(token: Token) {
        this.name = token.image;
        this.registerLocation('name', token.getLocation());
    }

    @parser(TokenType.EQUALS, { err: 'CONST_MISSING_EQUALS' }) setEquals() {}

    @parser(Expression, { err: 'INVALID_EXPRESSION' })
    setValue(exp: Expression) {
        this.value = exp;
        this.createAndRegisterLocation('self', this.locations.self, exp.locations.self);
    }

    name: string = '';
    value: Expression;

    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitConstantDeclaration(this);
    }

    prettyName() {
        return `const ${this.name}`;
    }
}