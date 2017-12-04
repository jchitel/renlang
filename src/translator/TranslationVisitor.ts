import INodeVisitor from '../syntax/INodeVisitor';
import Translator from './Translator';
import Func from './Func';
import Instruction, {
    PushScopeFrame, PopFrame, Break, Continue, PushLoopFrame, TrueBranch, SetBoolRef, SetIntegerRef,
    InteropReference, FalseBranch, AddToScope, ReferenceMutate, Jump, Noop, SetTupleRef, Return, Throw,
    PushTryFrame, ErrorRef, SetCharRef, SetFloatRef, SetStringRef, ArrayAccessRef, SetArrayRef,
    BinaryOperatorRef, FieldAccessRef, FunctionCallRef, CopyRef, SetStructRef, UnaryOperatorRef
} from '../runtime/instructions';
import { RBool, RInteger } from '../runtime/types';
import * as ast from '~/syntax';


export default class TranslationVisitor implements INodeVisitor<number | void> {
    translator: Translator;
    func: Func;

    constructor(translator: Translator, func: Func) {
        this.translator = translator;
        this.func = func;
    }

    addInstruction<T extends Instruction>(instr: T) {
        return this.func.addInstruction(instr);
    }

    addRefInstruction(cb: (ref: number) => Instruction) {
        return this.func.addRefInstruction(this.translator, cb);
    }

    newReference() {
        return this.translator.newReference();
    }

    nextInstrNum() {
        return this.func.nextInstrNum();
    }

    pushScope<T extends Instruction>(instr: T) {
        return this.func.pushScope(instr);
    }

    popScope(instr: Instruction) {
        return this.func.popScope(instr);
    }

    addToScope(name: string, ref: number, inst: Instruction) {
        return this.func.addToScope(name, ref, inst);
    }

    getFromScope(name: string) {
        return this.func.getFromScope(name);
    }

    referenceIdentifier(name: string) {
        return this.addRefInstruction(ref => this.translator.referenceIdentifier(ref, name, this.func.moduleId));
    }

    lambda(exp: ast.LambdaExpression) {
        return this.addRefInstruction(ref => this.translator.lambda(exp, ref, this.func.moduleId));
    }

    /**
     * DELCARATIONS
     * Declarations are not visited by the translator because they don't by themselves
     * represent any kind of runtime construct.
     * The program is a container for everything else.
     * Imports only bring names from other modules, by translation modules don't really exist anymore.
     * Types have nothing to do with execution.
     * Functions themselves are translated by the translator itself, their bodies are handled in the expressions and statements.
     * Same with exports, the declaration doesn't exist at runtime.
     */

    // NOTE: putting (number | void) as the type of at least one method makes inference work properly
    visitProgram(_program: ast.Program): number | void { throw new Error("Method not implemented."); }
    visitImportDeclaration(_decl: ast.ImportDeclaration): never { throw new Error("Method not implemented."); }
    visitTypeDeclaration(_decl: ast.TypeDeclaration): never { throw new Error("Method not implemented."); }
    visitTypeParam(_param: ast.TypeParam): never { throw new Error("Method not implemented."); }
    visitFunctionDeclaration(_decl: ast.FunctionDeclaration): never { throw new Error("Method not implemented."); }
    visitParam(_param: ast.Param): never { throw new Error("Method not implemented."); }
    visitLambdaParam(_param: ast.LambdaParam): never { throw new Error("Method not implemented."); }
    visitConstantDeclaration(_delc: ast.ConstantDeclaration): never { throw new Error("Method not implemented."); }
    visitExportDeclaration(_decl: ast.ExportDeclaration): never { throw new Error("Method not implemented."); }
    visitExportForwardDeclaration(_decl: ast.ExportForwardDeclaration): never { throw new Error("Method not implemented."); }

    /**
     * TYPES
     * Types are not visited by the translator because they have already done their job
     * in the type checking phase.
     * The types of expressions are still accessible after type checking, but the types
     * themselves do not have anything to do with execution.
     */

    visitBuiltInType(_type: ast.BuiltInType): never { throw new Error("Method not implemented."); }
    visitIdentifierType(_type: ast.IdentifierType): never { throw new Error("Method not implemented."); }
    visitArrayType(_type: ast.ArrayType): never { throw new Error("Method not implemented."); }
    visitFunctionType(_type: ast.FunctionType): never { throw new Error("Method not implemented."); }
    visitParenthesizedType(_type: ast.ParenthesizedType): never { throw new Error("Method not implemented."); }
    visitSpecificType(_type: ast.SpecificType): never { throw new Error("Method not implemented."); }
    visitStructType(_type: ast.StructType): never { throw new Error("Method not implemented."); }
    visitTupleType(_type: ast.TupleType): never { throw new Error("Method not implemented."); }
    visitUnionType(_type: ast.UnionType): never { throw new Error("Method not implemented."); }
    visitNamespaceAccessType(_type: ast.NamespaceAccessType): never { throw new Error("Method not implemented."); }

    /**************
     * STATEMENTS *
     **************/

    visitBlock(block: ast.Block): void {
        if (block.statements.length === 0) {
            this.addInstruction(new Noop());
            return;
        }
        this.pushScope(new PushScopeFrame());
        for (const statement of block.statements) {
            statement.visit(this);
        }
        this.popScope(new PopFrame());
    }

    visitExpressionStatement(exp: ast.ExpressionStatement): void {
        exp.expression.visit(this);
    }

    visitBreakStatement(stmt: ast.BreakStatement): void {
        this.addInstruction(new Break(stmt.loopNumber));
    }

    visitContinueStatement(stmt: ast.ContinueStatement): void {
        this.addInstruction(new Continue(stmt.loopNumber));
    }

    visitDoWhileStatement(stmt: ast.DoWhileStatement): void {
        const loopFrame = this.pushScope(new PushLoopFrame({ start: this.nextInstrNum() + 1 }));
        // save the branch location
        const startInstructionNumber = this.nextInstrNum();
        // insert the body instructions
        stmt.body.visit(this);
        // store the condition value into a reference
        const conditionRef = stmt.conditionExp.visit(this) as number;
        // branch if the condition is true
        this.addInstruction(new TrueBranch(conditionRef, startInstructionNumber));
        loopFrame.end = this.nextInstrNum();
        this.popScope(new PopFrame());
    }

    visitForStatement(stmt: ast.ForStatement): void {
        // initialize iterable and i
        const iterableRef = stmt.iterableExp.visit(this) as number;
        const iRef = this.addRefInstruction(ref => new SetIntegerRef(ref, 0));
        const loopFrame = this.pushScope(new PushLoopFrame({ start: this.nextInstrNum() + 1 }));
        // check if we should enter the loop, branching if we shouldn't
        const checkInstructionNumber = this.nextInstrNum();
        const checkRef = this.addRefInstruction(ref => new InteropReference({
            ref,
            inRefs: [iterableRef, iRef], 
            operation: (iter, i) => new RBool(i.value < iter.value.length)
        }));
        const branch = this.addInstruction(new FalseBranch({ ref: checkRef }));
        // loop body, start by adding the iterator variable to the scope, and remove it when we're done
        const iterRef = this.addRefInstruction(ref => new InteropReference({
            ref,
            inRefs: [iterableRef, iRef],
            operation: (iter, i) => iter.value[i.value]
        }));
        this.addToScope(stmt.iterVar, iterRef, new AddToScope(stmt.iterVar, iterRef));
        stmt.body.visit(this);
        // increment i and jump back to the condition expression
        this.addInstruction(new ReferenceMutate({ ref: iRef, mutator: i => new RInteger(i.value + 1) }));
        this.addInstruction(new Jump({ target: checkInstructionNumber }));
        // insert noop as target of the loop
        branch.target = this.nextInstrNum();
        loopFrame.end = branch.target;
        this.popScope(new PopFrame());
    }

    visitReturnStatement(stmt: ast.ReturnStatement): void {
        // save expression to ref
        let returnRef;
        if (stmt.exp) {
            returnRef = stmt.exp.visit(this) as number;
        } else {
            returnRef = this.addRefInstruction(ref => new SetTupleRef(ref, []));
        }
        // add return expression
        this.addInstruction(new Return(returnRef));
    }

    visitThrowStatement(stmt: ast.ThrowStatement): void {
        // save expression to ref
        const throwRef = stmt.exp.visit(this) as number;
        // add throw instruction
        this.addInstruction(new Throw(throwRef));
    }

    visitTryCatchStatement(stmt: ast.TryCatchStatement): void {
        // insert a try frame
        const tryFrame = this.pushScope(new PushTryFrame({ catches: [] }));
        // insert try body
        stmt.try.visit(this);
        // remove the try frame
        this.popScope(new PopFrame());
        // insert jump to either finally or after the finally
        const jump = this.addInstruction(new Jump());
        // iterate each catch
        for (const { param, body } of stmt.catches) {
            // save the instruction number to the try frame
            tryFrame.catches.push({ start: this.nextInstrNum(), type: param.typeNode.type });
            // add the catch parameter to the scope
            this.pushScope(new PushScopeFrame());
            const errRef = this.addRefInstruction(ref => new ErrorRef(ref));
            this.addToScope(param.name, errRef, new AddToScope(param.name, errRef));
            // insert the catch body
            body.visit(this);
            // pop the scope containing the err variable
            this.popScope(new PopFrame());
            // use same jump as try
            this.addInstruction(jump);
        }
        // finally logic
        if (stmt.finally) {
            // save location to try frame and jump target
            tryFrame.finally = { start: this.nextInstrNum(), end: NaN };
            jump.target = this.nextInstrNum();
            // insert finally body
            stmt.finally.visit(this);
            // insert noop for end of finally
            tryFrame.finally.end = this.nextInstrNum();
            this.addInstruction(new Noop());
        } else {
            // insert noop, save location as jump target
            jump.target = this.nextInstrNum();
            this.addInstruction(new Noop());
        }
    }

    visitWhileStatement(stmt: ast.WhileStatement): void {
        const loopFrame = this.pushScope(new PushLoopFrame({ start: this.nextInstrNum() + 1 }));
        // store the condition value into a reference
        const conditionInstructionNumber = this.nextInstrNum();
        const conditionRef = stmt.conditionExp.visit(this) as number;
        // branch if the condition is false
        const branch = this.addInstruction(new FalseBranch({ ref: conditionRef }));
        // insert the body instructions
        stmt.body.visit(this);
        // jump to the check instruction
        this.addInstruction(new Jump({ target: conditionInstructionNumber }));
        // add a false branch target noop
        branch.target = this.nextInstrNum();
        loopFrame.end = branch.target;
        this.popScope(new PopFrame());
    }

    /***************
     * EXPRESSIONS *
     ***************/

    visitBoolLiteral(lit: ast.BoolLiteral): number {
        return this.addRefInstruction(ref => new SetBoolRef(ref, lit.value));
    }

    visitCharLiteral(lit: ast.CharLiteral): number {
        return this.addRefInstruction(ref => new SetCharRef(ref, lit.value));
    }

    visitFloatLiteral(lit: ast.FloatLiteral): number {
        return this.addRefInstruction(ref => new SetFloatRef(ref, lit.value));
    }

    visitIntegerLiteral(lit: ast.IntegerLiteral): number {
        return this.addRefInstruction(ref => new SetIntegerRef(ref, lit.value));
    }

    visitStringLiteral(lit: ast.StringLiteral): number {
        return this.addRefInstruction(ref => new SetStringRef(ref, lit.value));
    }

    visitIdentifierExpression(exp: ast.IdentifierExpression): number {
        // check to see if the name matches a variable in the current scope
        if (this.getFromScope(exp.name) !== undefined) return this.getFromScope(exp.name);
        // otherwise we need the translator to resolve a module-scope reference
        return this.referenceIdentifier(exp.name);
    }

    visitArrayAccess(acc: ast.ArrayAccess): number {
        const targetRef = acc.target.visit(this) as number;
        const indexRef = acc.indexExp.visit(this) as number;
        return this.addRefInstruction(ref => new ArrayAccessRef(ref, targetRef, indexRef));
    }

    visitArrayLiteral(lit: ast.ArrayLiteral): number {
        const refs: number[] = [];
        for (const item of lit.items) {
            refs.push(item.visit(this) as number);
        }
        return this.addRefInstruction(ref => new SetArrayRef(ref, refs));
    }

    visitBinaryExpression(exp: ast.BinaryExpression): number {
        const leftRef = exp.left.visit(this) as number;
        const rightRef = exp.right.visit(this) as number;
        return this.addRefInstruction(ref => new BinaryOperatorRef(ref, leftRef, exp.operator, rightRef));
    }

    visitFieldAccess(acc: ast.FieldAccess): number {
        const targetRef = acc.target.visit(this) as number;
        return this.addRefInstruction(ref => new FieldAccessRef(ref, targetRef, acc.field));
    }

    visitFunctionApplication(app: ast.FunctionApplication): number {
        const targetRef = app.target.visit(this) as number;
        const argRefs = app.args.map(p => p.visit(this) as number);
        return this.addRefInstruction(ref => new FunctionCallRef(ref, targetRef, argRefs));
    }

    visitIfElseExpression(exp: ast.IfElseExpression): number {
        // get new reference id for result of expression
        const ref = this.newReference();
        // if condition
        const conditionRef = exp.condition.visit(this) as number;
        const branch = this.addInstruction(new FalseBranch({ ref: conditionRef }));
        // evaluate consequent, copy into result, jump
        const csqRef = exp.consequent.visit(this) as number;
        this.addInstruction(new CopyRef(csqRef, ref));
        const jump = this.addInstruction(new Jump());
        // evaluate alternate, copy into result
        branch.target = this.nextInstrNum();
        const altRef = exp.alternate.visit(this) as number;
        this.addInstruction(new CopyRef(altRef, ref));
        jump.target = this.nextInstrNum();
        this.addInstruction(new Noop());
        // return result reference
        return ref;
    }

    visitLambdaExpression(exp: ast.LambdaExpression): number {
        return this.lambda(exp);
    }

    visitParenthesizedExpression(exp: ast.ParenthesizedExpression): number {
        return exp.inner.visit(this) as number;
    }

    visitStructLiteral(lit: ast.StructLiteral): number {
        const refs: { [key: string]: number } = {};
        for (const { key, value } of lit.entries) {
            refs[key] = value.visit(this) as number;
        }
        return this.addRefInstruction(ref => new SetStructRef(ref, refs));
    }

    visitTupleLiteral(lit: ast.TupleLiteral): number {
        const refs: number[] = [];
        for (const item of lit.items) {
            refs.push(item.visit(this) as number);
        }
        return this.addRefInstruction(ref => new SetTupleRef(ref, refs));
    }

    visitUnaryExpression(exp: ast.UnaryExpression): number {
        const targetRef = exp.target.visit(this) as number;
        return this.addRefInstruction(ref => new UnaryOperatorRef(ref, exp.operator, targetRef));
    }

    visitVarDeclaration(decl: ast.VarDeclaration): number {
        const initRef = decl.initExp.visit(this) as number;
        this.addToScope(decl.name, initRef, new AddToScope(decl.name, initRef));
        return initRef;
    }
}
