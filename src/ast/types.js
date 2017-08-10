import ASTNode from './ASTNode';
import { TInteger, TFloat, TChar, TBool, TTuple, TStruct, TArray, TFunction, TUnion, TUnknown, TAny } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';


export class Type extends ASTNode {
    reduce() {
        if (this.builtIn) {
            return new PrimitiveType(this.builtIn.image, this.builtIn.getLocation());
        } else if (this.name) {
            return new IdentifierType(this.name.image, this.name.getLocation());
        } else if (this.functionType) {
            return this.functionType.reduce();
        } else if (this.tupleType) {
            return this.tupleType.reduce();
        } else if (this.structType) {
            return this.structType.reduce();
        } else if (this.arrayType) {
            return this.arrayType.reduce();
        } else if (this.unionType) {
            return this.unionType.reduce();
        } else if (this.innerType) {
            const node = this._createNewNode();
            node.parenthesized = this.innerType.reduce();
            node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
            return node;
        } else {
            throw new Error('Invalid Type node');
        }
    }

    resolveType(typeChecker, module) {
        return this.type = this.parenthesized.resolveType(typeChecker, module);
    }
}

export class PrimitiveType extends ASTNode {
    constructor(typeNode, location) {
        super({ typeNode });
        this.registerLocation('self', location);
    }

    resolveType() {
        switch (this.typeNode) {
            case 'u8': case 'byte': this.type = new TInteger(8, false); break;
            case 'i8': this.type = new TInteger(8, true); break;
            case 'u16': case 'short': this.type = new TInteger(16, false); break;
            case 'i16': this.type = new TInteger(16, true); break;
            case 'u32': this.type = new TInteger(32, false); break;
            case 'i32': case 'integer': this.type = new TInteger(32, true); break;
            case 'u64': this.type = new TInteger(64, false); break;
            case 'i64': case 'long': this.type = new TInteger(64, true); break;
            case 'int': this.type = new TInteger(Infinity, true); break;
            case 'f32': case 'float': this.type = new TFloat(32); break;
            case 'f64': case 'double': this.type = new TFloat(64); break;
            case 'char': this.type = new TChar(); break;
            case 'string': this.type = new TArray(new TChar()); break;
            case 'bool': this.type = new TBool(); break;
            case 'void': this.type = new TTuple([]); break;
            case 'any': this.type = new TAny(); break;
            default: throw new Error(`Invalid built-in type ${this.typeNode}`);
        }
        return this.type;
    }
}

export class IdentifierType extends ASTNode {
    constructor(name, location) {
        super({ name });
        this.registerLocation('self', location);
    }

    resolveType(typeChecker, module) {
        if (!module.types[this.name]) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_NOT_DEFINED(this.name), module.path, this.locations.self));
            this.type = new TUnknown();
        } else {
            this.type = typeChecker.getType(module, this.name);
        }
        return this.type;
    }
}

export class FunctionType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.paramTypes = this.paramTypes.map(t => t.reduce());
        node.returnType = this.returnType.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), node.returnType.locations.self);
        return node;
    }

    resolveType(typeChecker, module) {
        const paramTypes = this.paramTypes.map(t => t.resolveType(typeChecker, module));
        const returnType = this.returnType.resolveType(typeChecker, module);
        if (paramTypes.some(t => t instanceof TUnknown) || returnType instanceof TUnknown) this.type = new TUnknown();
        else this.type = new TFunction(paramTypes, returnType);
        return this.type;
    }
}

export class TupleType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.types = this.types.map(t => t.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module) {
        const types = this.types.map(t => t.resolveType(typeChecker, module));
        if (types.some(t => t instanceof TUnknown)) this.type = new TUnknown();
        else this.type = new TTuple(types);
        return this.type;
    }
}

export class StructType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.fields = [];
        for (let i = 0; i < this.fieldTypes.length; ++i) {
            node.fields.push({ type: this.fieldTypes[i].reduce(), name: this.fieldNameTokens[i].image });
            node.registerLocation(`field_${this.fieldNameTokens[i].image}`, this.fieldNameTokens[i].getLocation());
        }
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module) {
        const fields = {};
        for (const field of this.fields) {
            if (fields[field.name]) {
                typeChecker.errors.push(new TypeCheckError(mess.NAME_CLASH(field.name), module.path, this.locations[`field_${field.name}`]));
                this.type = new TUnknown();
                break;
            }
            fields[field.name] = field.type.resolveType(typeChecker, module);
            if (fields[field.name] instanceof TUnknown) {
                this.type = new TUnknown();
                break;
            }
        }
        if (!this.type) this.type = new TStruct(fields);
        return this.type;
    }
}

export class ArrayType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.baseType = this.baseType.reduce();
        node.createAndRegisterLocation('self', node.baseType.locations.self, this.closeBracketToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module) {
        const baseType = this.baseType.resolveType(typeChecker, module);
        if (baseType instanceof TUnknown) this.type = new TUnknown();
        else this.type = new TArray(baseType);
    }
}

export class UnionType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        // collapse the left and right types into a single list if they are union types
        const left = this.left.reduce();
        if (left instanceof UnionType) node.types = [...left.types];
        else node.types = [left];
        const right = this.right.reduce();
        if (right instanceof UnionType) node.types = [...node.types, ...right.types];
        else node.types.push(right);
        node.createAndRegisterLocation('self', node.left.locations.self, node.right.locations.self);
        return node;
    }

    resolveType(typeChecker, module) {
        const types = this.types.map(t => t.resolveType(typeChecker, module));
        if (types.some(t => t instanceof TUnknown)) this.type = new TUnknown();
        else this.type = new TUnion(types);
        return this.type;
    }
}
