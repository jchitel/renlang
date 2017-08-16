import { Expression } from '../ast/expressions';
import { Return } from './instructions';


export default class Func {
    constructor(id, moduleFunction) {
        this.id = id;
        this.ast = moduleFunction.ast;
        this.instructions = [];
        this.nextReferenceId = 0;
        this.scope = {};
    }

    transformBody(translator) {
        const body = this.ast.body;
        if (body instanceof Expression) {
            const ref = body.transform(translator, this);
            this.instructions.push(new Return(ref));
        } else {
            body.transform(translator, this);
        }
    }

    newReference() {
        return this.nextReferenceId++;
    }

    addInstruction(instr) {
        this.instructions.push(instr);
        return instr;
    }

    addRefInstruction(callback) {
        const ref = this.newReference();
        this.addInstruction(callback(ref));
        return ref;
    }

    nextInstrNum() {
        return this.instructions.length;
    }
}
