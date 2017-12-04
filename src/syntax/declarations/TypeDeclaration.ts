import { Token, TokenType } from '~/parser/Tokenizer';
import ASTNode from '~/syntax/ASTNode';
import INodeVisitor from '~/syntax/INodeVisitor';
import { parser, nonTerminal, exp, ParseResult } from '~/parser/Parser';
import { Declaration } from './Program';
import { Type } from '~/syntax/types/Type';


/**
 * TypeConstraint ::= COLON Type
 */
const TypeConstraint = {
    ':': exp(TokenType.COLON, { definite: true }),
    type: exp(Type, { err: 'INVALID_TYPE_PARAM' }),
};

/**
 * TypeParam = ('+' | '-')? IDENT TypeConstraint?
 */
export class TypeParam extends ASTNode {
    @parser(['+', '-'], { optional: true, definite: true })
    setVarianceOp(op: Token) {
        this.varianceOp = op.image;
        this.registerLocation('variance', op.getLocation());
    }

    @parser(TokenType.IDENT, { definite: true, err: 'INVALID_TYPE_PARAM' })
    setName(name: Token) {
        this.name = name.image;
        this.registerLocation('name', name.getLocation());
        const start = this.varianceOp ? this.locations.variance : this.locations.name;
        this.createAndRegisterLocation('self', start, this.locations.name);
    }

    @parser(TypeConstraint, { optional: true })
    setConstraint(constraint: ParseResult) {
        this.typeConstraint = constraint.type as Type;
        const colon = constraint[':'] as Token;
        this.createAndRegisterLocation('constraint', colon.getLocation(), this.typeConstraint.locations.self);
        this.createAndRegisterLocation('self', this.locations.self, this.typeConstraint.locations.self);
    }

    name: string;
    varianceOp?: string;
    typeConstraint?: Type;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitTypeParam(this);
    }
}

/**
 * TypeParamList ::= '<' TypeParam(+ sep COMMA) '>'
 */
export const TypeParamList = {
    '<': '<',
    params: exp(TypeParam, { repeat: '+', sep: TokenType.COMMA }),
    '>': exp('>', { definite: true }),
}

/**
 * TypeDeclaration ::= 'type' IDENT? TypeParamList? EQUALS Type
 */
@nonTerminal({ implements: Declaration })
export class TypeDeclaration extends Declaration {
    @parser('type', { definite: true })
    setTypeToken(token: Token) {
        this.registerLocation('self', token.getLocation());
    }

    @parser(TokenType.IDENT, { optional: true })
    setName(token: Token) {
        this.name = token.image;
        this.registerLocation('name', token.getLocation());
    }

    @parser(TypeParamList, { optional: true })
    setTypeParams(result: ParseResult) {
        this.typeParams = result.params as TypeParam[];
    }

    @parser(TokenType.EQUALS, { err: 'TYPE_DECL_MISSING_EQUALS' }) setEquals() {}

    @parser(Type, { err: 'INVALID_TYPE' })
    setType(type: Type) {
        this.typeNode = type;
        this.createAndRegisterLocation('self', this.locations.self, type.locations.self);
    }

    name: string = '';
    typeParams: TypeParam[] = [];
    typeNode: Type;
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitTypeDeclaration(this);
    }
}