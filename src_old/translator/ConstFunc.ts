import Func from './Func';
import { ConstBranch, ConstSet, ConstRef, Return } from '~/runtime/instructions';
import Translator from './Translator';
import TranslationVisitor from './TranslationVisitor';
import { ConstantDeclaration } from '~/syntax';


export default class ConstFunc extends Func {
    ast: ConstantDeclaration;

    constructor(id: number, moduleFunction: { ast: ConstantDeclaration }, moduleId: number, modulePath: string = '') {
        super(id, moduleFunction, moduleId, modulePath);
    }

    translate(translator: Translator) {
        // every constant has a special global reference created for it
        const constRef = translator.newConstantRef();
        // a const branch is a special constant memoization branch that will branch only if the constant has been initialized
        const branch = this.addInstruction(new ConstBranch({ constRef }));
        // if it hasn't it is evaluated and stored in the constant
        const valueRef = this.ast.value.visit(new TranslationVisitor(translator, this)) as number;
        this.addInstruction(new ConstSet(constRef, valueRef));
        // branch target picks up and reads the constant, then returns it
        branch.target = this.nextInstrNum();
        const localRef = this.addRefInstruction(translator, ref => new ConstRef(ref, constRef));
        this.addInstruction(new Return(localRef));
    }
    
    getStackEntry() {
        const { startLine: line, startColumn: column } = this.ast.locations.self;
        return `${this.ast.prettyName()} (${this.modulePath}:${line}:${column})`;
    }
}