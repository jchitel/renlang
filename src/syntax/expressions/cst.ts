import CSTNode from '../CSTNode';
import { Token, ILocation } from '../../parser/Tokenizer';
import { STTypeArgList } from '../types/cst';
import { Param } from '../declarations/ast';
import { STParam } from '../declarations/cst';
import {
    Expression, IntegerLiteral, FloatLiteral, CharLiteral, StringLiteral, BoolLiteral, IdentifierExpression,
    ArrayAccess, ArrayLiteral, BinaryExpression, FieldAccess, FunctionApplication, IfElseExpression,
    LambdaExpression, LambdaParam, ParenthesizedExpression, StructLiteral, TupleLiteral, UnaryExpression,
    VarDeclaration
} from './ast';
import { STStatement } from '../statements/cst';
import { getOperatorMetadata, verifyMultiOperator } from '../../runtime/operators';


export class STExpression extends CSTNode<Expression> {
    choice: Token | STExpression;

    reduce(): Expression {
        if (this.choice instanceof Token) {
            if (this.choice.type === 'INTEGER_LITERAL') {
                return new IntegerLiteral(this.choice.value as number, this.choice.getLocation());
            } else if (this.choice.type === 'FLOAT_LITERAL') {
                return new FloatLiteral(this.choice.value as number, this.choice.getLocation());
            } else if (this.choice.type === 'CHAR_LITERAL') {
                return new CharLiteral(this.choice.value as string, this.choice.getLocation());
            } else if (this.choice.type === 'STRING_LITERAL') {
                return new StringLiteral(this.choice.value as string, this.choice.getLocation());
            } else if (['TRUE', 'FALSE'].includes(this.choice.type)) {
                return new BoolLiteral(this.choice.image, this.choice.getLocation());
            } else {
                return new IdentifierExpression(this.choice.image, this.choice.getLocation());
            }
        } else {
            return this.choice.reduce();
        }
    }
}

export class STArrayAccess extends STExpression {
    target: STExpression;
    openBracketToken: Token;
    indexExp: STExpression;
    closeBracketToken: Token;

    reduce() {
        const node = new ArrayAccess();
        node.target = this.target.reduce();
        node.indexExp = this.indexExp.reduce();
        node.createAndRegisterLocation('self', node.target.locations.self, this.closeBracketToken.getLocation());
        return node;
    }
}

export class STArrayLiteral extends STExpression {
    openBracketToken: Token;
    items: STExpression[];
    closeBracketToken: Token;

    reduce() {
        const node = new ArrayLiteral();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openBracketToken.getLocation(), this.closeBracketToken.getLocation());
        return node;
    }
}

export class STBinaryExpression extends STExpression {
    operatorToken: Token;
    left: STExpression;
    right: STExpression;

    reduce() {
        // handle < and > problems
        this.operatorToken = verifyMultiOperator(this.operatorToken);
        // convert the current binary expression tree to a list
        const items = this.toList();
        // Shunting-yard algorithm to resolve precedence
        const expStack: Expression[] = [];
        const operStack: Token[] = [];
        while (items.length) {
            const item = items.shift() as (Expression | Token);
            if (item instanceof Expression) {
                expStack.push(item);
            } else {
                while (operStack.length && this.shouldPopOperator(item, operStack[operStack.length - 1])) {
                    const exp = new BinaryExpression();
                    exp.right = expStack.pop() as Expression;
                    exp.left = expStack.pop() as Expression;
                    const oper = operStack.pop() as Token;
                    exp.symbol = oper.image;
                    exp.registerLocation('oper', oper.getLocation());
                    exp.createAndRegisterLocation('self', exp.left.locations.self, exp.right.locations.self);
                    expStack.push(exp);
                }
                operStack.push(item);
            }
        }
        // empty the operator stack
        while (operStack.length) {
            const exp = new BinaryExpression();
            exp.right = expStack.pop() as Expression;
            exp.left = expStack.pop() as Expression;
            const oper = operStack.pop() as Token;
            exp.symbol = oper.image;
            exp.registerLocation('oper', oper.getLocation());
            exp.createAndRegisterLocation('self', exp.left.locations.self, exp.right.locations.self);
            expStack.push(exp);
        }
        // final expression tree is the only element left on the exp stack
        return expStack[0];
    }

    toList() {
        const items = [];
        // the tree is left-associative, so we assemble the list from right to left
        let right = this.right.reduce();
        let operToken = this.operatorToken;
        // if the left is binary, don't reduce it because that's what we're doing
        let left = this.left.choice instanceof STBinaryExpression ? this.left.choice : this.left.reduce();
        while (true) {
            items.unshift(right);
            items.unshift(operToken);
            if (left instanceof STBinaryExpression) {
                right = left.right.reduce();
                operToken = left.operatorToken;
                left = left.left.choice instanceof STBinaryExpression ? left.left.choice : left.left.reduce();
            } else {
                items.unshift(left);
                break;
            }
        }
        return items;
    }

    shouldPopOperator(nextToken: Token, stackToken: Token) {
        const nextOper = getOperatorMetadata(nextToken.image, 'infix') as { precedence: number };
        const stackOper = getOperatorMetadata(stackToken.image, 'infix') as { precedence: number, associativity: string };
        return stackOper.precedence >= nextOper.precedence && ['left', 'none'].includes(stackOper.associativity);
    }
}

export class STFieldAccess extends STExpression {
    target: STExpression;
    dotToken: Token;
    fieldNameToken: Token;

    reduce() {
        const node = new FieldAccess();
        node.target = this.target.reduce();
        node.field = this.fieldNameToken.image;
        node.registerLocation('field', this.fieldNameToken.getLocation());
        node.createAndRegisterLocation('self', node.target.locations.self, node.locations.field);
        return node;
    }
}

export class STFunctionApplication extends STExpression {
    target: STExpression;
    typeArgList: STTypeArgList;
    openParenToken: Token;
    args: STExpression[];
    closeParenToken: Token;

    reduce() {
        const node = new FunctionApplication();
        node.target = this.target.reduce();
        if (this.typeArgList) node.typeArgs = this.typeArgList.reduce();
        node.args = this.args.map(v => v.reduce());
        node.createAndRegisterLocation('self', node.target.locations.self, this.closeParenToken.getLocation());
        return node;
    }
}

export class STIfElseExpression extends STExpression {
    ifToken: Token;
    openParenToken: Token;
    condition: STExpression;
    closeParenToken: Token;
    consequent: STExpression;
    elseToken: Token;
    alternate: STExpression;

    reduce() {
        const node = new IfElseExpression();
        node.condition = this.condition.reduce();
        node.consequent = this.consequent.reduce();
        node.alternate = this.alternate.reduce();
        node.createAndRegisterLocation('self', this.ifToken.getLocation(), node.alternate.locations.self);
        return node;
    }
}

export class STLambdaExpression extends STExpression {
    openParenToken?: Token;
    shorthandParam?: Token;
    params: STLambdaParam[];
    closeParenToken?: Token;
    fatArrowToken: Token;
    functionBody: STExpression | STStatement;

    reduce() {
        const node = new LambdaExpression();
        if (this.shorthandParam) node.params = [new STLambdaParam({ choice: this.shorthandParam }, []).reduce()];
        else node.params = this.params.map(p => p.reduce());
        node.body = this.functionBody.reduce();
        // lambda expression start location is complicated because it can either be a '(' or a param name
        node.createAndRegisterLocation('self',
            this.openParenToken ? this.openParenToken.getLocation() : node.params[0].locations.name,
            node.body.locations.self);
        return node;
    }
}

export class STLambdaParam extends CSTNode<Param | LambdaParam> {
    choice: STParam | Token;

    reduce(): Param | LambdaParam {
        if (this.choice instanceof STParam) return this.choice.reduce();
        const node = new LambdaParam();
        node.name = this.choice.image;
        node.registerLocation('name', this.choice.getLocation());
        return node;
    }
}

export class STParenthesizedExpression extends STExpression {
    openParenToken: Token;
    inner: STExpression;
    closeParenToken: Token;

    reduce() {
        const node = new ParenthesizedExpression();
        node.inner = this.inner.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}

export class STStructLiteral extends STExpression {
    openBraceToken: Token;
    entries: STStructEntry[];
    closeBraceToken: Token;

    reduce() {
        const node = new StructLiteral();
        node.entries = [];
        for (const entry of this.entries) {
            const { key, value, loc } = entry.reduce();
            node.entries.push({ key, value });
            node.registerLocation(`key_${key}`, loc);
        }
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }
}

export class STStructEntry extends CSTNode<{ key: string, value: Expression, loc: ILocation }> {
    keyToken: Token;
    colonToken: Token;
    value: STExpression;

    reduce() {
        return {
            key: this.keyToken.image,
            value: this.value.reduce(),
            loc: this.keyToken.getLocation(),
        };
    }
}

export class STTupleLiteral extends STExpression {
    openParenToken: Token;
    items: STExpression[];
    closeParenToken: Token;

    reduce() {
        const node = new TupleLiteral();
        node.items = this.items.map(i => i.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }
}

export class STUnaryExpression extends STExpression {
    operatorToken: Token;
    target: STExpression;

    reduce() {
        // verify that any multiple operator tokens are valid
        this.operatorToken = verifyMultiOperator(this.operatorToken);
        const node = new UnaryExpression();
        node.symbol = this.operatorToken.image;
        node.registerLocation('oper', this.operatorToken.getLocation());
        node.target = this.target.reduce();
        return node;
    }
}

export class STPrefixExpression extends STUnaryExpression {
    reduce() {
        const node = super.reduce();
        node.createAndRegisterLocation('self', node.locations.oper, node.target.locations.self);
        return node;
    }
}

export class STPostfixExpression extends STUnaryExpression {
    reduce() {
        const node = super.reduce();
        node.createAndRegisterLocation('self', node.target.locations.self, node.locations.oper);
        return node;
    }
}

export class STVarDeclaration extends STExpression {
    varIdentToken: Token;
    equalsToken: Token;
    initialValue: STExpression;

    reduce() {
        const node = new VarDeclaration();
        node.name = this.varIdentToken.image;
        node.registerLocation('name', this.varIdentToken.getLocation());
        node.initExp = this.initialValue.reduce();
        node.createAndRegisterLocation('self', node.locations.name, node.initExp.locations.self);
        return node;
    }
}
