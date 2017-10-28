import { CSTNode, ASTNode, TypedNode } from '../Node';
import { Token } from '../../parser/Tokenizer';
import TypeChecker from '../../typecheck/TypeChecker';
import TypeCheckContext from '../../typecheck/TypeCheckContext';
import Module from '../../runtime/Module';
import { TType, TInteger, TFloat, TChar, TBool, TTuple, TArray, TAny } from '../../typecheck/types';
import { ILocation } from '../../parser/Tokenizer';
import { TYPE_NOT_DEFINED } from '../../typecheck/TypeCheckerMessages';


export abstract class Type extends ASTNode implements TypedNode {
    getType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        return this.type || (this.type = this.resolveType(typeChecker, module, context));
    }

    abstract resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext): TType;
}

export class STType extends CSTNode<Type> {
    choice: Token | STType;

    reduce(): Type {
        if (this.choice instanceof Token) {
            if (this.choice.type === 'IDENT') {
                return new IdentifierType(this.choice.image, this.choice.getLocation());
            } else {
                return new PrimitiveType(this.choice.image, this.choice.getLocation());
            }
        } else {
            return this.choice.reduce();
        }
    }
}

/**
 * If this is in its own file, then it will be a circular dependency.
 * KEEP THIS IN THE SAME MODULE AS "Type".
 */
export class PrimitiveType extends Type {
    typeNode: string;

    constructor(typeNode: string, location: ILocation) {
        super();
        this.typeNode = typeNode;
        this.registerLocation('self', location);
    }

    resolveType() {
        switch (this.typeNode) {
            case 'u8': case 'byte': return new TInteger(8, false);
            case 'i8': return new TInteger(8, true);
            case 'u16': case 'short': return new TInteger(16, false);
            case 'i16': return new TInteger(16, true);
            case 'u32': return new TInteger(32, false);
            case 'i32': case 'integer': return new TInteger(32, true);
            case 'u64': return new TInteger(64, false);
            case 'i64': case 'long': return new TInteger(64, true);
            case 'int': return new TInteger(Infinity, true);
            case 'f32': case 'float': return new TFloat(32);
            case 'f64': case 'double': return new TFloat(64);
            case 'char': return new TChar();
            case 'string': return new TArray(new TChar());
            case 'bool': return new TBool();
            case 'void': return new TTuple([]);
            case 'any': return new TAny();
            default: throw new Error(`Invalid built-in type ${this.typeNode}`);
        }
    }
}

/**
 * If this is in its own file, then it will be a circular dependency.
 * KEEP THIS IN THE SAME MODULE AS "Type".
 */
export class IdentifierType extends Type {
    name: string;

    constructor(name: string, location: ILocation) {
        super();
        this.name = name;
        this.registerLocation('self', location);
    }

    resolveType(typeChecker: TypeChecker, module: Module, context: TypeCheckContext) {
        // check for a type param first
        if (context.typeParams[this.name]) {
            return context.typeParams[this.name];
        } else if (!module.types[this.name]) {
            // no type param, no module-scoped type, it's an error
            return typeChecker.pushError(TYPE_NOT_DEFINED(this.name), module.path, this.locations.self);
        } else {
            return typeChecker.getType(module, this.name);
        }
    }
}
