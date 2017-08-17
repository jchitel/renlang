import Func from './Func';
import { ParamRef, AddToScope, FunctionRef, ConstBranch, ConstSet, ConstRef, Return } from '../runtime/instructions';
import { TInteger, TChar, TTuple, TArray } from '../typecheck/types';


/**
 * Control class responsible for enumerating all used functions in a program 
 * and translating all of them to instructions.
 */
export default class Translator {
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
    translate(modules) {
        this.modules = modules;
        const mainModule = modules[0];
        const mainFunction = mainModule.functions.main;
        if (!mainFunction || !this.isMainSignature(mainFunction.ast.type)) {
            throw new Error(`Main module must contain an entry point function with the name "main", return type "void" or integer, and a variable amount of string arguments [${mainModule.path}:1:1]`);
        }
        const func = new Func(0, mainFunction, 0);
        mainFunction.func = func;
        this.functions.push(func);
        this.translateFunction(func);
        return this.functions;
    }

    /**
     * Given the type of a function, determine if it has the correct signature to be the main function.
     */
    isMainSignature(type) {
        return (type.returnType === new TTuple([]) || type.returnType instanceof TInteger) && type.params.equals([new TArray(new TArray(new TChar()))]);
    }

    /**
     * Given a function, populate it with its corresponding instructions
     */
    translateFunction(func) {
        // add instructions to expose parameters on the function scope
        for (let i = 0; i < func.ast.params.length; ++i) {
            // copy the param to a ref
            const paramRef = func.addRefInstruction(this, ref => new ParamRef(i, ref));
            // link the param name to that ref
            func.addInstruction(new AddToScope(func.ast.params[i].name, paramRef));
        }
        // process the function body
        func.translateBody(this);
    }

    /**
     * Given a function that represents a constant value, translate the constant
     * to a function-wrapped constant
     */
    translateConstant(func) {
        // every constant has a special global reference created for it
        const constRef = this.newConstantRef();
        // a const branch is a special constant memoization branch that will branch only if the constant has been initialized
        const branch = func.addInstruction(new ConstBranch(constRef));
        // if it hasn't it is evaluated and stored in the constant
        const valueRef = func.ast.value.translate(this, func);
        func.addInstruction(new ConstSet(constRef, valueRef));
        // branch target picks up and reads the constant, then returns it
        branch.target = func.nextInstrNum();
        const localRef = func.addRefInstruction(this, ref => new ConstRef(ref, constRef));
        func.addInstruction(new Return(localRef));
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
    lambda(lambda, ref) {
        const func = new Func(this.functions.length, { ast: lambda });
        this.functions.push(func);
        this.translateFunction(func);
        return new FunctionRef(ref, func.id);
    }

    /**
     * Given a reference id and the name of some module-scoped identifier,
     * locate the identifier, translate it if it hasn't been already,
     * and return an instruction that creates a reference to it with the given id.
     */
    referenceIdentifier(ref, name, moduleId) {
        const module = this.modules[moduleId];
        if (module.functions[name]) {
            if (!module.functions[name].func) {
                // name references a function that has not yet been translated, translate it
                const func = new Func(this.functions.length, module.functions[name], moduleId);
                module.functions[name].func = func;
                this.functions.push(func);
                this.translateFunction(func);
            }
            // return a function reference
            return new FunctionRef(ref, module.functions[name].func.id);
        } else if (module.constants[name]) {
            if (!module.constants[name].func) {
                // name references a constant that has not yet been translated, translate it
                const func = new Func(this.functions.length, module.constants[name], moduleId);
                module.constants[name].func = func;
                this.functions.push(func);
                this.translateConstant(func);
            }
            // return a function reference
            return new FunctionRef(ref, module.constants[name].func.id);
        } else {
            // because type checking has already been done, we know this MUST be an import
            const imp = module.imports[name];
            const exp = this.modules[imp.moduleId].exports[imp.exportName];
            // recurse to find the value in the imported module
            return this.referenceIdentifier(ref, exp.exportedName, imp.moduleId);
        }
    }
}
