import Func from './Func';
import { ExportDeclaration } from '../syntax/declarations';
import { Expression } from '../syntax/expressions';
import { ConstBranch, ConstSet, ConstRef, Return } from '../runtime/instructions';
import Translator from './Translator';


export default class ConstFunc extends Func {
    ast: ExportDeclaration;

    constructor(id: number, moduleFunction: { ast: ExportDeclaration }, moduleId: number) {
        super(id, moduleFunction, moduleId);
    }

    translate(translator: Translator) {
        // every constant has a special global reference created for it
        const constRef = translator.newConstantRef();
        // a const branch is a special constant memoization branch that will branch only if the constant has been initialized
        const branch = this.addInstruction(new ConstBranch({ constRef }));
        // if it hasn't it is evaluated and stored in the constant
        const valueRef = (this.ast.value as Expression).translate(translator, this);
        this.addInstruction(new ConstSet(constRef, valueRef));
        // branch target picks up and reads the constant, then returns it
        branch.target = this.nextInstrNum();
        const localRef = this.addRefInstruction(translator, ref => new ConstRef(ref, constRef));
        this.addInstruction(new Return(localRef));
    }
}