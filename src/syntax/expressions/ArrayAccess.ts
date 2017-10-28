import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import { NOT_ARRAY, TYPE_MISMATCH } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import { ArrayAccessRef } from '../../runtime/instructions';


export class ArrayAccess extends Expression {
    target: Expression;
    indexExp: Expression;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const arrayType = this.target.getType(typeChecker, module, context);
        // type is not an array type so it can't be inferred
        if (!arrayType.isArray()) return typeChecker.pushError(NOT_ARRAY, module.path, this.target.locations.self);
        // verify that the index expression is an integer
        const indexExpType = this.indexExp.getType(typeChecker, module, context);
        if (!indexExpType.isInteger())
            typeChecker.pushError(TYPE_MISMATCH(indexExpType, 'unsigned int'), module.path, this.indexExp.locations.self);
        // type is the base type of the array
        return arrayType.getBaseType();
    }

    translate(translator: Translator, func: Func) {
        const targetRef = this.target.translate(translator, func);
        const indexRef = this.indexExp.translate(translator, func);
        return func.addRefInstruction(translator, ref => new ArrayAccessRef(ref, targetRef, indexRef));
    }
}

export class STArrayAccess extends STExpression {
    target: STExpression;
    openBracketToken: Token;
    indexExp: STExpression;
    closeBracketToken: Token;

    reduce() {
        const node = new ArrayAccess();
        node.target = this.target.reduce();
        node.indexExp = this.indexExp.reduce();
        node.createAndRegisterLocation('self', node.target.locations.self, this.closeBracketToken.getLocation());
        return node;
    }
}
