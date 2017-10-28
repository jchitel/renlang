import { ASTNode, CSTNode, TypedNode, TranslatableNode } from '../Node';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TType, TInteger, TFloat, TBool, TChar, TArray } from '../../typecheck/types';
import { Token } from '../../parser/Tokenizer';
import Translator from '../../translator/Translator';
import Func from '../../translator/Func';
import { ILocation } from '../../parser/Tokenizer';
import { SetIntegerRef, SetFloatRef, SetBoolRef, SetCharRef, SetStringRef } from '../../runtime/instructions';
import { VALUE_NOT_DEFINED } from '../../typecheck/TypeCheckerMessages';


export abstract class Expression extends ASTNode implements TypedNode, TranslatableNode {
    getType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.type || (this.type = this.resolveType(typeChecker, module, context));
    }

    /**
     * Forces a type resolution of this expression.
     * Do not call this directly, use getType() instead.
     */
    abstract resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext): TType;

    abstract translate(translator: Translator, func: Func): number;
}

export class STExpression extends CSTNode<Expression> {
    choice: Token | STExpression;

    reduce(): Expression {
        if (this.choice instanceof Token) {
            if (this.choice.type === 'INTEGER_LITERAL') {
                return new IntegerLiteral(this.choice.value as number, this.choice.getLocation());
            } else if (this.choice.type === 'FLOAT_LITERAL') {
                return new FloatLiteral(this.choice.value as number, this.choice.getLocation());
            } else if (this.choice.type === 'CHAR_LITERAL') {
                return new CharLiteral(this.choice.value as string, this.choice.getLocation());
            } else if (this.choice.type === 'STRING_LITERAL') {
                return new StringLiteral(this.choice.value as string, this.choice.getLocation());
            } else if (['TRUE', 'FALSE'].includes(this.choice.type)) {
                return new BoolLiteral(this.choice.image, this.choice.getLocation());
            } else {
                return new IdentifierExpression(this.choice.image, this.choice.getLocation());
            }
        } else {
            return this.choice.reduce();
        }
    }
}

export class BoolLiteral extends Expression {
    value: boolean;

    constructor(image: string, location: ILocation) {
        super();
        this.value = image === 'true';
        this.registerLocation('self', location);
    }

    resolveType() {
        return new TBool();
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, (ref: number) => new SetBoolRef(ref, this.value));
    }
}

export class CharLiteral extends Expression {
    value: string;

    constructor(value: string, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }

    resolveType() {
        return new TChar();
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, (ref: number) => new SetCharRef(ref, this.value));
    }
}

export class FloatLiteral extends Expression {
    value: number;

    constructor(value: number, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }

    resolveType() {
        return new TFloat(64);
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, ref => new SetFloatRef(ref, this.value));
    }
}

export class IdentifierExpression extends Expression {
    name: string;

    constructor(name: string, location: ILocation) {
        super();
        this.name = name;
        this.registerLocation('self', location);
    }

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        let actualType: TType = context.symbolTable[this.name];
        if (!actualType) actualType = typeChecker.getValueType(module, this.name) as TType;
        if (!actualType) return typeChecker.pushError(VALUE_NOT_DEFINED(this.name), module.path, this.locations.self);
        return actualType;
    }

    translate(translator: Translator, func: Func) {
        // check to see if the name matches a variable in the current scope
        if (func.getFromScope(this.name) !== undefined) return func.getFromScope(this.name);
        // otherwise we need the translator to resolve a module-scope reference
        return func.addRefInstruction(translator, ref => translator.referenceIdentifier(ref, this.name, func.moduleId));
    }
}

export class IntegerLiteral extends Expression {
    value: number;

    constructor(value: number, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }

    resolveType() {
        let signed, size;
        if (this.value < 0) {
            signed = true;
            if ((-this.value) < (2 ** 7)) size = 8;
            else if ((-this.value) < (2 ** 15)) size = 16;
            else if ((-this.value) < (2 ** 31)) size = 32;
            else if (this.value > -(2 ** 63)) size = 64;
            else size = Infinity;
        } else {
            signed = false;
            if (this.value < (2 ** 8)) size = 8;
            else if (this.value < (2 ** 16)) size = 16;
            else if (this.value < (2 ** 32)) size = 32;
            else if (this.value < (2 ** 64)) size = 64;
            else size = Infinity;
        }
        return new TInteger(size, signed);
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, ref => new SetIntegerRef(ref, this.value));
    }
}

export class StringLiteral extends Expression {
    value: string;

    constructor(value: string, location: ILocation) {
        super();
        this.value = value;
        this.registerLocation('self', location);
    }

    resolveType() {
        return new TArray(new TChar());
    }

    translate(translator: Translator, func: Func) {
        return func.addRefInstruction(translator, (ref: number) => new SetStringRef(ref, this.value));
    }
}
