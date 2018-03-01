import { NodeBase, SyntaxType, Expression } from '~/syntax/environment';
import { Token, TokenType } from '~/parser/lexer';
import { ParseFunc, seq, tok } from '~/parser/parser';


export interface FieldAccess extends NodeBase {
    syntaxType: SyntaxType.FieldAccess;
    target: Expression;
    field: Token;
}

export interface FieldAccessSuffix extends NodeBase {
    syntaxType: SyntaxType.FieldAccess;
    field: Token;
    setBase(target: Expression): FieldAccess;
}

export const FieldAccessSuffix: ParseFunc<FieldAccessSuffix> = seq(
    tok('.'),
    tok(TokenType.IDENT),
    ([_, field], location) => ({
        syntaxType: SyntaxType.FieldAccess as SyntaxType.FieldAccess,
        location,
        field,
        setBase(target: Expression) {
            return {
                ...this,
                target,
                location: this.location.merge(target.location)
            }
        }
    })
);
