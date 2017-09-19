import ASTNode from './ASTNode';
import { TInteger, TFloat, TChar, TBool, TTuple, TStruct, TArray, TFunction, TUnion, TUnknown, TAny } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';


export class Type extends ASTNode {
    reduce() {
        if (this.builtIn) {
            return new PrimitiveType(this.builtIn.image, this.builtIn.getLocation());
        } else if (this.nameToken) {
            return new IdentifierType(this.nameToken.image, this.nameToken.getLocation());
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
        } else if (this.parenthesized) {
            return this.parenthesized.reduce();
        } else {
            throw new Error('Invalid Type node');
        }
    }
}

export class ParenthesizedType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.inner = this.inner.reduce();
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, typeParams) {
        return this.type = this.inner.resolveType(typeChecker, module, typeParams);
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

    resolveType(typeChecker, module, typeParams) {
        // check for a type param first
        if (typeParams[this.name]) {
            this.type = typeParams[this.name];
        } else if (!module.types[this.name]) {
            // no type param, no module-scoped type, it's an error
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

    /**
     * TODO: does it make sense for explicit function types to have type params?
     * If so, the syntax will have to be extended to allow for that...
     */
    resolveType(typeChecker, module, typeParams) {
        const paramTypes = this.paramTypes.map(t => t.resolveType(typeChecker, module, typeParams));
        const returnType = this.returnType.resolveType(typeChecker, module, typeParams);
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

    resolveType(typeChecker, module, typeParams) {
        const types = this.types.map(t => t.resolveType(typeChecker, module, typeParams));
        if (types.some(t => t instanceof TUnknown)) this.type = new TUnknown();
        else this.type = new TTuple(types);
        return this.type;
    }
}

export class StructType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.fields = [];
        for (const field of this.fields) {
            const { type, name, loc } = field.reduce();
            node.fields.push({ type, name });
            node.registerLocation(`field_${name}`, loc);
        }
        node.createAndRegisterLocation('self', this.openBraceToken.getLocation(), this.closeBraceToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, typeParams) {
        const fields = {};
        for (const field of this.fields) {
            if (fields[field.name]) {
                typeChecker.errors.push(new TypeCheckError(mess.NAME_CLASH(field.name), module.path, this.locations[`field_${field.name}`]));
                this.type = new TUnknown();
                break;
            }
            fields[field.name] = field.type.resolveType(typeChecker, module, typeParams);
            if (fields[field.name] instanceof TUnknown) {
                this.type = new TUnknown();
                break;
            }
        }
        if (!this.type) this.type = new TStruct(fields);
        return this.type;
    }
}

export class Field extends ASTNode {
    reduce() {
        return { type: this.typeNode.reduce(), name: this.nameToken.image, loc: this.nameToken.getLocation() };
    }
}

export class ArrayType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.baseType = this.baseType.reduce();
        node.createAndRegisterLocation('self', node.baseType.locations.self, this.closeBracketToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module, typeParams) {
        const baseType = this.baseType.resolveType(typeChecker, module, typeParams);
        if (baseType instanceof TUnknown) this.type = new TUnknown();
        else this.type = new TArray(baseType);
        return this.type;
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
        node.createAndRegisterLocation('self', left.locations.self, right.locations.self);
        return node;
    }

    resolveType(typeChecker, module, typeParams) {
        const types = this.types.map(t => t.resolveType(typeChecker, module, typeParams));
        if (types.some(t => t instanceof TUnknown)) this.type = new TUnknown();
        else this.type = new TUnion(types);
        return this.type;
    }
}

export class GenericType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.name = this.nameToken.image;
        node.registerLocation('name', this.nameToken.getLocation());
        node.typeArgs = this.typeArgList.reduce();
        node.createAndRegisterLocation('self', node.locations.name, this.typeArgList.closeGtToken.getLocation());
        return node;
    }

    /**
     * So, this "generic type" is an "instantiation" of some type declaration with type parameters.
     * In reality, this should be called a "specific type" because it is no longer generic.
     * So what type does this resolve to?
     * Well, a generic type is a combination of the type parameters and the type definition, which uses the type parameters.
     * When it is made specific, there are no longer any type parameters; they are "filled in".
     * So all that we are left with will be the type definition, with type parameter usages "filled in".
     * What does this mean for us?
     * Well, here we have the name of the generic type, and the type arguments, which we will use to "fill in" the type.
     * So we need to do what an IdentifierType does and look up the type name, which will resolve to a TGeneric.
     * We then iterate over the type arguments (resolving their types first), link them with the type parameters of the TGeneric,
     * then take the type definition of the TGeneric and visit it with the type arguments, filling in the type parameters.
     * The result will be a copy of the type definition with all type parameters filled in.
     * To do the "filling in" we will need yet another visitor method for each type node class, call it specifyTypeParams.
     */
    resolveType(typeChecker, module, typeParams) {
        // first, resolve the TGeneric associated with the name TODO: this logic is duplicated from IdentifierType
        let genericType;
        if (typeParams[this.name]) {
            genericType = typeParams[this.name];
        } else if (!module.types[this.name]) {
            // no type param, no module-scoped type, it's an error
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_NOT_DEFINED(this.name), module.path, this.locations.self));
            return this.type = new TUnknown();
        } else {
            genericType = typeChecker.getType(module, this.name);
        }
        // second, resolve all type arguments
        const typeArgs = this.typeArgs.map(a => a.resolveType(typeChecker, module, typeParams));
        // third, specify the generic type
        return this.type = genericType.specifyTypeParams(typeArgs);
    }
}

export class TypeArgList extends ASTNode {
    reduce() {
        return this.types.map(t => t.reduce());
    }
}
