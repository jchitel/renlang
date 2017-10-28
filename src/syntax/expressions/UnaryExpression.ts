import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import { TFunction, TUnknown } from '../../typecheck/types';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import { VALUE_NOT_DEFINED, INVALID_UNARY_OPERATOR } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import { UnaryOperatorRef } from '../../runtime/instructions';
import { createUnary, verifyMultiOperator, UnaryOperator } from '../../runtime/operators';


export class UnaryExpression extends Expression {
    target: Expression;
    symbol: string;
    prefix: boolean;
    operator: UnaryOperator;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const targetType = this.target.getType(typeChecker, module, context);
        // check if the operator exists
        const oper = createUnary(this.symbol, this.prefix ? 'prefix' : 'postfix', targetType);
        // no unary operator of that kind
        if (!oper) return typeChecker.pushError(VALUE_NOT_DEFINED(this.symbol), module.path, this.locations.oper);
        this.operator = oper;
        // invalid target type
        if (this.operator.functionType instanceof TUnknown) return typeChecker.pushError(INVALID_UNARY_OPERATOR(this.symbol, targetType), module.path, this.locations.self);
        // the return type of the operator type is the type of this expression
        return (this.operator.functionType as TFunction).returnType;
    }

    translate(translator: Translator, func: Func) {
        const targetRef = this.target.translate(translator, func);
        return func.addRefInstruction(translator, ref => new UnaryOperatorRef(ref, this.operator, targetRef));
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
