import Func, { FunctionFunc } from './Func';
import ConstFunc from './ConstFunc';
import Instruction, { SetFunctionRef } from '../runtime/instructions';
import { TInteger, TChar, TTuple, TArray, TFunction } from '../typecheck/types';
import Module from '../runtime/Module';
import { LambdaExpression } from '../syntax/expressions';


/**
 * Control class responsible for enumerating all used functions in a program
 * and translating all of them to instructions.
 */
export default class Translator {
    modules: Module[];
    functions: Func[];
    nextReferenceId: number;
    nextConstantRefId: number;

    constructor() {
        // the result of this operation is the list of functions, starting with the main function
        this.functions = [];
        // counter for reference ids
        this.nextReferenceId = 0;
        // counter for constant ids
        this.nextConstantRefId = 0;
    }

    /**
     * Entry point.
     * Given a list of modules, starting with the main module, translate the program to functions composed of instructions.
     */
    translate(modules: Module[]) {
        this.modules = modules;
        const mainModule = modules[0];
        const mainFunction = mainModule.functions.main;
        if (!mainFunction || !this.isMainSignature(mainFunction.ast.type as TFunction)) {
            throw new Error(`Main module must contain an entry point function with the name "main", return type "void" or integer, and a variable amount of string arguments [${mainModule.path}:1:1]`);
        }
        const func = new FunctionFunc(0, mainFunction, 0, mainModule.path);
        mainFunction.func = func;
        this.functions.push(func);
        func.translate(this);
        return this.functions;
    }

    /**
     * Given the type of a function, determine if it has the correct signature to be the main function.
     */
    isMainSignature(type: TFunction) {
        return ((type.returnType instanceof TTuple && type.returnType.types.length === 0) || type.returnType instanceof TInteger)
            && (type.paramTypes.length === 1)
            && (type.paramTypes[0] instanceof TArray)
            && ((type.paramTypes[0] as TArray).baseType instanceof TArray)
            && (((type.paramTypes[0] as TArray).baseType as TArray).baseType instanceof TChar);
    }

    /**
     * Because references themselves are not created until runtime, we need to associate
     * something with references now at translate-time, so we use ids. References are global,
     * so reference ids are tracket at the translator level.
     */
    newReference() {
        return this.nextReferenceId++;
    }

    /**
     * Likewise with constants. Each constant, as it is used, will place its resolved value into a constant table.
     * This allows constants to be memoized.
     */
    newConstantRef() {
        return this.nextConstantRefId++;
    }

    /**
     * Given a lambda function AST node, translate it, add it to the functions list,
     * and return an instruction that creates a reference to it with the given id.
     */
    lambda(lambda: LambdaExpression, ref: number, moduleId: number) {
        const func = new FunctionFunc(this.functions.length, { ast: lambda }, moduleId, this.modules[moduleId].path);
        this.functions.push(func);
        func.translate(this);
        return new SetFunctionRef(ref, func.id);
    }

    /**
     * Given a reference id and the name of some module-scoped identifier,
     * locate the identifier, translate it if it hasn't been already,
     * and return an instruction that creates a reference to it with the given id.
     */
    referenceIdentifier(ref: number, name: string, moduleId: number): Instruction {
        const module = this.modules[moduleId];
        if (module.imports[name]) {
            // functions and constants list always include imported values, so we need to check the imports list first
            const imp = module.imports[name];
            const exp = this.modules[imp.moduleId].exports[imp.exportName];
            // recurse to find the value in the imported module
            return this.referenceIdentifier(ref, exp.valueName, imp.moduleId);
        } else if (module.functions[name]) {
            if (!module.functions[name].func) {
                // name references a function that has not yet been translated, translate it
                const func = new FunctionFunc(this.functions.length, module.functions[name], moduleId, this.modules[moduleId].path);
                module.functions[name].func = func;
                this.functions.push(func);
                func.translate(this);
            }
            // return a function reference
            return new SetFunctionRef(ref, module.functions[name].func.id);
        } else {
            // not imported, not a function, MUST be a constant
            if (!module.constants[name].func) {
                // name references a constant that has not yet been translated, translate it
                const func = new ConstFunc(this.functions.length, module.constants[name], moduleId, this.modules[moduleId].path);
                module.constants[name].func = func;
                this.functions.push(func);
                func.translate(this);
            }
            // return a function reference
            return new SetFunctionRef(ref, module.constants[name].func.id);
        }
    }
}
