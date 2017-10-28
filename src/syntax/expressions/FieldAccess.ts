import { Expression, STExpression } from './Expression';
import { Token } from '../../parser/Tokenizer';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import { NOT_STRUCT, VALUE_NOT_DEFINED } from '../../typecheck/TypeCheckerMessages';
import Module from '../../runtime/Module';
import { FieldAccessRef } from '../../runtime/instructions';


export class FieldAccess extends Expression {
    target: Expression;
    field: string;

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        const structType = this.target.getType(typeChecker, module, context);
        // type is not a struct type so it can't be inferred
        if (!structType.isStruct()) return typeChecker.pushError(NOT_STRUCT, module.path, this.target.locations.self);
        // verify that the field exists
        if (!structType.hasField(this.field)) return typeChecker.pushError(VALUE_NOT_DEFINED(this.field), module.path, this.locations.field);
        // return the type of the field
        return structType.getFieldType(this.field);
    }

    translate(translator: Translator, func: Func) {
        const targetRef = this.target.translate(translator, func);
        return func.addRefInstruction(translator, ref => new FieldAccessRef(ref, targetRef, this.field));
    }
}

export class STFieldAccess extends STExpression {
    target: STExpression;
    dotToken: Token;
    fieldNameToken: Token;

    reduce() {
        const node = new FieldAccess();
        node.target = this.target.reduce();
        node.field = this.fieldNameToken.image;
        node.registerLocation('field', this.fieldNameToken.getLocation());
        node.createAndRegisterLocation('self', node.target.locations.self, node.locations.field);
        return node;
    }
}
