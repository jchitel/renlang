import { Expression, STExpression } from './Expression';
import { LambdaExpression } from './LambdaExpression';
import { STTypeArgList, Type } from '../types';
import { Token } from '../../parser/Tokenizer';
import { TFunction, TUnknown } from '../../typecheck/types';
import TypeCheckError from '../../typecheck/TypeCheckError';
import { NOT_INVOKABLE, TYPE_MISMATCH, INVALID_ARG_COUNT } from '../../typecheck/TypeCheckerMessages';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { FunctionCallRef } from '../../runtime/instructions';


export class FunctionApplication extends Expression {
    target: Expression;
    typeArgs: Type[];
    args: Expression[];

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const funcType = this.target.getType(typeChecker, module, context);
        // the type is not a function type so it cannot be inferred
        if (!funcType.isFunction()) {
            typeChecker.errors.push(new TypeCheckError(NOT_INVOKABLE, module.path, this.target.locations.self));
            return new TUnknown();
        }
        const paramCount = funcType.getParamCount();
        const argCount = this.args.length;
        if (paramCount !== argCount) {
            typeChecker.errors.push(new TypeCheckError(INVALID_ARG_COUNT(paramCount, argCount), module.path, this.target.locations.self));
            return funcType.getReturnType();
        }
        // resolve parameters TODO handle type parameters
        const paramTypes = funcType.getParamTypes();
        const argTypes = this.args.map(a => a.getType(typeChecker, module, context));
        for (let i = 0; i < argTypes.length; ++i) {
            const [paramType, argType] = [paramTypes[i], argTypes[i]];
            // skip arguments that have already been errored
            if (argType instanceof TUnknown) continue;
            // resolve passed value against parameter type
            if (!paramType.isAssignableFrom(argType)) {
                typeChecker.errors.push(new TypeCheckError(TYPE_MISMATCH(argType, paramType.toString()), module.path, this.args[i].locations.self));
                continue;
            }
            if (this.args[i] instanceof LambdaExpression) {
                // function application is the only place that lambdas can be passed (for now), so we need to complete the resolution of the type and the lambda body
                (argType as TFunction).completeResolution(paramType);
                (this.args[i] as LambdaExpression).completeResolution(typeChecker, module);
            }
        }
        // resulting expression type is the return type of the function type
        return funcType.getReturnType();
    }

    translate(translator: Translator, func: Func) {
        const targetRef = this.target.translate(translator, func);
        const argRefs = this.args.map(p => p.translate(translator, func));
        return func.addRefInstruction(translator, ref => new FunctionCallRef(ref, targetRef, argRefs));
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
