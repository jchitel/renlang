import { Expression, STExpression } from './Expression';
import { LambdaExpression } from './LambdaExpression';
import { STTypeArgList, Type } from '../types';
import { Token } from '../../parser/Tokenizer';
import { TType, TFunction, TUnknown } from '../../typecheck/types';
import {
    NOT_INVOKABLE, NOT_GENERIC_FUNCTION, TYPE_MISMATCH, INVALID_ARG_COUNT,
    INVALID_TYPE_ARG_COUNT, INVALID_TYPE_ARG
} from '../../typecheck/TypeCheckerMessages';
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

    /**
     * This is one of the most complex type resolution methods in the whole language.
     * There is a different process for each of the following three cases:
     * 1. Calling a non-generic function
     * 2. Calling a generic function, explicitly specifying type arguments
     * 3. Calling a generic function without type arguments (requiring inference)
     * 
     * All three processes start the same, but diverge after that.
     * Because of this divergence, we have separate methods for each case.
     */
    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // get the type of the function
        const funcType = this.target.getType(typeChecker, module, context);
        // the type is not a function type so it cannot be inferred
        if (!funcType.isFunction()) return typeChecker.pushError(NOT_INVOKABLE, module.path, this.target.locations.self);
        // now we diverge
        if (!funcType.isGeneric()) {
            // verify that we didn't specify type arguments
            if (this.typeArgs) return typeChecker.pushError(NOT_GENERIC_FUNCTION, module.path, this.locations.self);
            return this.resolveNormalFunction(typeChecker, module, context, funcType);
        } else {
            // is generic and we had type args, resolve an explicit generic function
            if (this.typeArgs) return this.resolveExplicitGenericFunction(typeChecker, module, context, funcType);
            // did not specify type args, resolve an implicit generic function
            return this.resolveImplicitGenericFunction(typeChecker, module, context, funcType);
        }
    }

    /**
     * Normal (non-generic) functions:
     * 1. Get the number of parameters in the function (assert that the number of arguments matches)
     * 2. Get the types of the arguments (assert that the args are assignable to the params)
     * 3. Resolve to the return type of the function
     */
    private resolveNormalFunction(tc: TypeChecker, mod: Module, ctx: TypeCheckContext, funcType: TType) {
        // verify parameter count
        if (!this.verifyParamCount(funcType)) return tc.pushError(INVALID_ARG_COUNT(funcType.getParamCount(), this.args.length), mod.path, this.target.locations.self);
        // verify arg assignments
        this.verifyArgAssignments(tc, mod, ctx, funcType.getParamTypes());
        // resolve to return type
        return funcType.getReturnType();
    }

    /**
     * Generic functions with explicit type parameters:
     * 1. Get the number of type parameters of the function (assert that the number of type args matches)
     * 2. Get the types of the type arguments (assert that the type args are assignable to the type params)
     * 3. Get the number of parameters in the function (assert that the number of arguments matches)
     * 4. Resolve the specific types of the function parameters from the type arguments
     * 5. Get the types of the arguments (assert that the args are assignable to the params)
     * 6. Resolve to the specific return type of the function
     */
    private resolveExplicitGenericFunction(tc: TypeChecker, mod: Module, ctx: TypeCheckContext, funcType: TType) {
        // verify type parameter count
        if (!this.verifyTypeParamCount(funcType)) return tc.pushError(INVALID_TYPE_ARG_COUNT(funcType.getTypeParamCount(), this.typeArgs.length), mod.path, this.locations.self);
        // verify type arg assignments (unlike normal arguments, broken type arg assignments can break everything, so we stop here)
        const typeArgs = this.typeArgs.map(a => a.getType(tc, mod, ctx));
        if (!this.verifyTypeArgAssignments(tc, mod, funcType, typeArgs)) return new TUnknown();
        // verify parameter count
        if (!this.verifyParamCount(funcType)) return tc.pushError(INVALID_ARG_COUNT(funcType.getParamCount(), this.args.length), mod.path, this.target.locations.self);
        // resolve the specific types of the params
        const paramTypes = (funcType as TFunction).getSpecificParamTypes(typeArgs);
        // verify arg assignments
        this.verifyArgAssignments(tc, mod, ctx, paramTypes);
        // resolve to specific return type
        return (funcType as TFunction).getSpecificReturnType(typeArgs);
    }

    /**
     * Generic functions with implicit type parameters:
     * 1. Get the number of parameters in the function (assert that the number of arguments matches)
     * 2. Assert that the args are assignable to the params WITHOUT assigned type parameters (i.e. structural)
     * 2. Infer the type arguments using the provided argument types
     * 3. Resolve the specific types of the function parameters from the type arguments
     * 4. Assert that the args are assignable to the params WITH assigned type parameters (i.e. consistency)
     * 5. Resolve to the specific return type of the function
     */
    private resolveImplicitGenericFunction(tc: TypeChecker, mod: Module, ctx: TypeCheckContext, funcType: TType) {
        // verify parameter count
        if (!this.verifyParamCount(funcType)) return tc.pushError(INVALID_ARG_COUNT(funcType.getParamCount(), this.args.length), mod.path, this.target.locations.self);
        // verify argument assignments against still-generic parameter types (verify type structure)
        const valid = this.verifyArgAssignments(tc, mod, ctx, funcType.getParamTypes());
        // only infer and verify the type arguments if the arg assignments are valid, otherwise just skip that part
        if (valid) {
            // infer type argument types
            const typeArgs = (funcType as TFunction).inferTypeArgumentTypes(this.args.map(a => a.getType(tc, mod, ctx)));
            // resolve the specific types of the params
            const paramTypes = (funcType as TFunction).getSpecificParamTypes(typeArgs);
            // verify arg assignments against the now-specified parameter types (verify consistency)
            this.verifyArgAssignments(tc, mod, ctx, paramTypes);
            // resolve to specific return type
            return (funcType as TFunction).getSpecificReturnType(typeArgs);
        }
        // impossible to determine return type because we can't determine the type arguments
        return new TUnknown();
    }

    private verifyParamCount(funcType: TType) {
        return this.args.length === funcType.getParamCount();
    }

    private verifyTypeParamCount(funcType: TType) {
        return this.typeArgs.length === funcType.getTypeParamCount();
    }

    private verifyArgAssignments(tc: TypeChecker, mod: Module, ctx: TypeCheckContext, paramTypes: TType[]) {
        // get param and arg types
        const argTypes = this.args.map(a => a.getType(tc, mod, ctx));
        // check each
        let error = false;
        for (let i = 0; i < argTypes.length; ++i) {
            if (argTypes[i] instanceof TUnknown) continue; // skip errored args
            // check assignability
            if (!paramTypes[i].isAssignableFrom(argTypes[i])) {
                tc.pushError(TYPE_MISMATCH(argTypes[i], paramTypes[i].toString()), mod.path, this.args[i].locations.self);
                error = true;
                continue;
            }
            // function application is the only place that lambdas can be passed (for now), so we need to complete the resolution of the type and the lambda body
            if (this.args[i] instanceof LambdaExpression) {
                (argTypes[i] as TFunction).completeResolution(paramTypes[i]);
                (this.args[i] as LambdaExpression).completeResolution(tc, mod);
            }
        }
        return !error;
    }

    private verifyTypeArgAssignments(tc: TypeChecker, mod: Module, funcType: TType, typeArgs: TType[]) {
        // get type param and type arg types
        const typeParams = funcType.getTypeParamTypes();
        // make sure each type argument is assignable to the corresponding type parameter
        let error = false;
        for (let i = 0; i < typeArgs.length; ++i) {
            if (typeArgs[i] instanceof TUnknown) continue; // skip errored args
            const [param, arg] = [typeParams.getValue(i), typeArgs[i]];
            if (param.isAssignableFrom(arg)) {
                tc.pushError(INVALID_TYPE_ARG(arg, param.name, param.constraint), mod.path, this.typeArgs[i].locations.self);
                error = true;
            }
        }
        return !error;
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
