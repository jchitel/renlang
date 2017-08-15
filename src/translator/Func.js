import { Expression } from '../ast/expressions';
import { Return } from './instructions';


export default class Func {
    constructor(id, moduleFunction) {
        this.id = id;
        this.ast = moduleFunction.ast;
        this.instructions = [];
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
}