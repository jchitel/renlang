import Func from './Func';
import { ParamToScope } from './instructions';
import { TInteger, TChar, TTuple, TArray } from '../typecheck/types';


export default class Translator {
    constructor() {
        this.functions = [];
    }

    translate(modules) {
        this.modules = modules;
        const mainModule = modules[0];
        const mainFunction = mainModule.functions.main;
        if (!mainFunction || !this.isMainSignature(mainFunction.ast.type)) {
            throw new Error(`Main module must contain an entry point function with the name "main", return type "void" or integer, and a variable amount of string arguments [${mainModule.path}:1:1]`);
        }
        this.functions.push(new Func(0, mainFunction));
        this.translateFunction(this.functions[0]);
    }

    isMainSignature(type) {
        return (type.returnType === new TTuple([]) || type.returnType instanceof TInteger) && type.params.every(p => p === new TArray(new TChar()));
    }

    translateFunction(func) {
        // add instructions to expose parameters on the function scope
        for (let i = 0; i < func.ast.params.length; ++i) {
            func.instructions.push(new ParamToScope(i, func.ast.params[i].name));
        }
        // process the function body
        func.transformBody(this);
    }
}
