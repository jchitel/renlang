import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import { TFunction, TUnknown } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import TypeCheckError from '../../typecheck/TypeCheckError';
import { VALUE_NOT_DEFINED, INVALID_BINARY_OPERATOR } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import { BinaryOperatorRef } from '../../runtime/instructions';
import { getOperatorMetadata, createBinary, verifyMultiOperator, BinaryOperator } from '../../runtime/operators';


export class BinaryExpression extends Expression {
    left: Expression;
    right: Expression;
    symbol: string;
    operator: BinaryOperator;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // resolve the left and right expression types
        const leftType = this.left.getType(typeChecker, module, context);
        const rightType = this.right.getType(typeChecker, module, context);
        // create the operator of the specific type
        const oper = createBinary(this.symbol, 'infix', leftType, rightType);
        if (!oper) {
            // no infix operator of that kind
            typeChecker.errors.push(new TypeCheckError(VALUE_NOT_DEFINED(this.symbol), module.path, this.locations.oper));
            return new TUnknown();
        }
        this.operator = oper;
        if (this.operator.functionType instanceof TUnknown) {
            // invalid left/right types
            typeChecker.errors.push(new TypeCheckError(INVALID_BINARY_OPERATOR(this.symbol, leftType, rightType), module.path, this.locations.self));
            return new TUnknown();
        }
        // the return type of the operator type is the type of this expression
        return (this.operator.functionType as TFunction).returnType;
    }

    translate(translator: Translator, func: Func) {
        const leftRef = this.left.translate(translator, func);
        const rightRef = this.right.translate(translator, func);
        return func.addRefInstruction(translator, ref => new BinaryOperatorRef(ref, leftRef, this.operator, rightRef));
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
