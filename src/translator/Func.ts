import ASTNode from '~/syntax/ASTNode';
import Instruction, { Return, ParamRef, AddToScope } from '~/runtime/instructions';
import Translator from './Translator';
import TranslationVisitor from './TranslationVisitor';
import { FunctionDeclaration, LambdaExpression, Expression } from '~/syntax';


type ASTFunction = FunctionDeclaration | LambdaExpression;

/**
 * Represents a runtime function, effectively a sequence of instructions tagged with an id.
 * Functions also manage a table of references, each with an id, and a scope table containing
 * the variables accessible to the code in the function, mapping variable name to a reference id.
 */
export default abstract class Func {
    id: number;
    ast: ASTNode;
    moduleId: number;
    modulePath: string;
    instructions: Instruction[];
    scope: { [key: string]: number }[];

    constructor(id: number, moduleFunction: { ast: ASTNode }, moduleId: number, modulePath: string = '') {
        // id of the function, a target for callers
        this.id = id;
        // the AST of the code that represents this function
        this.ast = moduleFunction.ast;
        // the id of the module containing the function
        this.moduleId = moduleId;
        this.modulePath = modulePath;
        // the list of instructions that make up this function
        this.instructions = [];
        // the scope stack (just for the translation process, not the runtime table)
        this.scope = [{}];
    }

    abstract translate(translator: Translator): void;
    abstract getStackEntry(): string;

    /**
     * It is a common use case to create an instruction that might be modified later,
     * so this function will add the instruction to the list and then return it, for brevity.
     */
    addInstruction<T extends Instruction>(instr: T) {
        this.instructions.push(instr);
        return instr;
    }

    /**
     * Another common use case is creating a new reference to be used later, then
     * creating an instruction that uses the reference. This function will create a reference,
     * invoke a callback to create an instruction using the reference, and then
     * return the reference.
     */
    addRefInstruction(translator: Translator, callback: (ref: number) => Instruction) {
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
    getFromScope(name: string): number {
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
    addToScope(name: string, ref: number, inst: Instruction) {
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
    pushScope<T extends Instruction>(inst: T) {
        this.addInstruction(inst);
        this.scope.push({});
        return inst;
    }

    /**
     * Pop a scope off of the scope stack,
     * and add a corresponding instruction for that operation
     */
    popScope(inst: Instruction) {
        this.addInstruction(inst);
        this.scope.pop();
        return inst;
    }
}

export class FunctionFunc extends Func {
    ast: ASTFunction;

    constructor(id: number, moduleFunction: { ast: ASTFunction }, moduleId: number, modulePath: string = '') {
        super(id, moduleFunction, moduleId, modulePath);
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
    translate(translator: Translator) {
        // add instructions to expose parameters on the function scope
        for (let i = 0; i < this.ast.params.length; ++i) {
            // copy the param to a ref
            const paramRef = this.addRefInstruction(translator, (ref: number) => new ParamRef(i, ref));
            // link the param name to that ref
            this.addToScope(this.ast.params[i].name, paramRef, new AddToScope(this.ast.params[i].name, paramRef));
        }
        // translate body
        const body = this.ast.body;
        if (body instanceof Expression) {
            const ref = body.visit(new TranslationVisitor(translator, this)) as number;
            this.instructions.push(new Return(ref));
        } else {
            body.visit(new TranslationVisitor(translator, this));
        }
    }

    getStackEntry() {
        const { startLine: line, startColumn: column } = this.ast.locations.self;
        return `${this.ast.prettyName()} (${this.modulePath}:${line}:${column})`;
    }
}
