import { Expression } from '../ast/expressions';
import { Return } from '../runtime/instructions';


/**
 * Represents a runtime function, effectively a sequence of instructions tagged with an id.
 * Functions also manage a table of references, each with an id, and a scope table containing
 * the variables accessible to the code in the function, mapping variable name to a reference id.
 */
export default class Func {
    constructor(id, moduleFunction, moduleId) {
        // id of the function, a target for callers
        this.id = id;
        // the AST of the code that represents this function
        this.ast = moduleFunction.ast;
        // the id of the module containing the function
        this.moduleId = moduleId;
        // the list of instructions that make up this function
        this.instructions = [];
        // the scope stack (just for the translation process, not the runtime table)
        this.scope = [{}];
    }

    /**
     * Invoked by the translator to fill the instruction list using the body of the function.
     * This is the entry point to the translate() visitor functions on all expression and
     * statement nodes.
     * Every expression node must populate instructions for itself, then return a reference id
     * that will contain the expression result at runtime. For expression-bodied functions,
     * the top-level reference id is used to create a return instruction for the function.
     * Statement nodes shouldn't return anything, just populate their instructions. Any
     * expressions inside statements should have their references saved to some instruction.
     */
    translateBody(translator) {
        const body = this.ast.body;
        if (body instanceof Expression) {
            const ref = body.translate(translator, this);
            this.instructions.push(new Return(ref));
        } else {
            body.translate(translator, this);
        }
    }

    /**
     * It is a common use case to create an instruction that might be modified later,
     * so this function will add the instruction to the list and then return it, for brevity.
     */
    addInstruction(instr) {
        this.instructions.push(instr);
        return instr;
    }

    /**
     * Another common use case is creating a new reference to be used later, then
     * creating an instruction that uses the reference. This function will create a reference,
     * invoke a callback to create an instruction using the reference, and then
     * return the reference.
     */
    addRefInstruction(translator, callback) {
        const ref = translator.newReference();
        this.addInstruction(callback(ref));
        return ref;
    }

    /**
     * Yet another common use case is to get the length of the instruction list
     * as the id of the next instruction that will be added. This is a more clear
     * way to do this.
     */
    nextInstrNum() {
        return this.instructions.length;
    }

    /**
     * Get the reference of a scope variable
     */
    getFromScope(name) {
        let scope = this.scope[this.scope.length - 1];
        for (let i = this.scope.length - 1; i >= 0; --i) {
            if (name in this.scope[i]) {
                scope = this.scope[i];
                break;
            }
        }
        return scope[name];
    }

    /**
     * Sets the reference of a variable on the current scope (or a parent scope if the name exists)
     * and add a corresponding instruction for that operation
     */
    addToScope(name, ref, inst) {
        this.addInstruction(inst);
        let scope = this.scope[this.scope.length - 1];
        for (let i = this.scope.length - 1; i >= 0; --i) {
            if (name in this.scope[i]) {
                scope = this.scope[i];
                break;
            }
        }
        scope[name] = ref;
        return inst;
    }

    /**
     * Push a new scope onto the scope stack,
     * and add a corresponding instruction for that operation
     */
    pushScope(inst) {
        this.addInstruction(inst);
        this.scope.push({});
        return inst;
    }

    /**
     * Pop a scope off of the scope stack,
     * and add a corresponding instruction for that operation
     */
    popScope(inst) {
        this.addInstruction(inst);
        this.scope.pop();
        return inst;
    }
}
