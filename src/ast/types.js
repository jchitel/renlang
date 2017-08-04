import ASTNode from './ASTNode';
import { Integer, Float, Char, Bool, Tuple, Struct, Array, Function, Unknown } from '../typecheck/types';
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
        } else if (this.innerType) {
            const node = this._createNewNode();
            node.parenthesized = this.innerType.reduce();
            node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
            return node;
        } else {
            throw new Error('Invalid Type node');
        }
    }

    visitType(typeChecker, module) {
        return this.parenthesized.visitType(typeChecker, module);
    }
}

export class PrimitiveType extends ASTNode {
    constructor(type, location) {
        super({ type });
        this.registerLocation('self', location);
    }

    visitType() {
        switch (this.type) {
            case 'u8': case 'byte': return new Integer(8, false);
            case 'i8': return new Integer(8, true);
            case 'u16': case 'short': return new Integer(16, false);
            case 'i16': return new Integer(16, true);
            case 'u32': return new Integer(32, false);
            case 'i32': case 'integer': return new Integer(32, true);
            case 'u64': return new Integer(64, false);
            case 'i64': case 'long': return new Integer(64, true);
            case 'int': return new Integer(Infinity, true);
            case 'f32': case 'float': return new Float(32);
            case 'f64': case 'double': return new Float(64);
            case 'char': return new Char();
            case 'string': return new Array(new Char());
            case 'bool': return new Bool();
            case 'void': return new Tuple([]);
            default: throw new Error(`Invalid built-in type ${this.type}`);
        }
    }
}

export class IdentifierType extends ASTNode {
    constructor(name, location) {
        super({ name });
        this.registerLocation('self', location);
    }

    visitType(typeChecker, module) {
        const type = module.types[this.name];
        if (!type) {
            typeChecker.errors.push(new TypeCheckError(mess.NOT_DEFINED(this.name), module.path, this.locations.self));
            return new Unknown();
        }
        if (type.imported) {
            // if the type is imported, we need to get the exported type
            // TODO: this may be recursive, plus this will be repeated. this logic belongs in the type checker class
            const imp = module.imports[this.name];
            const importedModule = typeChecker.modules[imp.moduleId];
            const exportedType = importedModule.exports[imp.exportName];
            const importedType = importedModule.types[exportedType.valueName];
            if (importedType.type) return importedType.type;
            const resolvedType = importedType.ast.visitType(typeChecker, importedModule);
            importedType.type = resolvedType;
            return resolvedType;
        } else {
            // otherwise the type was declared in this class
            if (type.type) return type.type;
            const resolvedType = type.ast.visitType(typeChecker, module);
            type.type = resolvedType;
            return resolvedType;
        }
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

    visitType(typeChecker, module) {
        const paramTypes = this.paramTypes.map(t => t.visitType(typeChecker, module));
        const returnType = this.returnType.visitType(typeChecker, module);
        if (paramTypes.some(t => t instanceof Unknown)) return new Unknown();
        if (returnType instanceof Unknown) return new Unknown();
        return new Function(paramTypes, returnType); // eslint-disable-line no-new-func
    }
}

export class TupleType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.types = this.types.map(t => t.reduce());
        node.createAndRegisterLocation('self', this.openParenToken.getLocation(), this.closeParenToken.getLocation());
        return node;
    }

    visitType(typeChecker, module) {
        const types = this.types.map(t => t.visitType(typeChecker, module));
        if (types.some(t => t instanceof Unknown)) return new Unknown();
        return new Tuple(types);
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

    visitType(typeChecker, module) {
        const fields = {};
        for (const field of this.fields) {
            if (fields[field.name]) {
                typeChecker.errors.push(new TypeCheckError(mess.NAME_CLASH(field.name), module.path, this.locations[`field_${field.name}`]));
                return new Unknown();
            }
            fields[field.name] = field.type.visitType(typeChecker, module);
            if (fields[field.name] instanceof Unknown) return new Unknown();
        }
        return new Struct(fields);
    }
}

export class ArrayType extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.baseType = this.baseType.reduce();
        node.createAndRegisterLocation('self', node.baseType.locations.self, this.closeBracketToken.getLocation());
        return node;
    }

    visitType(typeChecker, module) {
        const baseType = this.baseType.visitType(typeChecker, module);
        if (baseType instanceof Unknown) return new Unknown();
        return new Array(baseType);
    }
}
