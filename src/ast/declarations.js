import ASTNode from './ASTNode';
import { TFunction, TUnknown } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';


export class Program extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.imports = this.imports.map(i => i.reduce());
        const decls = this.declarations.map(d => d.reduce());
        node.functions = decls.filter(d => d instanceof FunctionDeclaration);
        node.types = decls.filter(d => d instanceof TypeDeclaration);
        node.exports = decls.filter(d => d instanceof ExportDeclaration);
        return node;
    }
}

export class ImportDeclaration extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.moduleName = this.moduleNameToken.value;
        node.registerLocation('moduleName', this.moduleNameToken.getLocation());
        node.importNames = {};
        const imports = this.imports.reduce();
        if (imports.default) {
            node.importNames.default = imports.default.image;
            node.registerLocation('import_default', imports.default.getLocation());
            node.registerLocation('importName_default', node.locations.import_default);
            node.registerLocation('importAlias_default', node.locations.import_default);
        } else {
            for (const imp of imports) {
                node.importNames[imp.name.image] = imp.alias.image;
                node.createAndRegisterLocation(`import_${imp.name.image}`, imp.name.getLocation(), imp.alias.getLocation());
                node.registerLocation(`importName_${imp.name.image}`, imp.name.getLocation());
                node.registerLocation(`importAlias_${imp.name.image}`, imp.alias.getLocation());
            }
        }
        return node;
    }
}

export class ImportList extends ASTNode {
    reduce() {
        if (this.defaultImportNameToken) {
            return { default: this.defaultImportNameToken };
        } else {
            return this.namedImports.reduce();
        }
    }
}

export class NamedImports extends ASTNode {
    reduce() {
        return this.importComponents.map(c => c.reduce());
    }
}

export class ImportComponent extends ASTNode {
    reduce() {
        if (this.importNameToken) {
            return { name: this.importNameToken, alias: this.importNameToken };
        } else {
            return this.importWithAlias.reduce();
        }
    }
}

export class ImportWithAlias extends ASTNode {
    reduce() {
        return { name: this.importNameToken, alias: this.importAliasToken };
    }
}

export class Declaration extends ASTNode {
    reduce() {
        if (this.function) return this.function.reduce();
        else if (this.typeNode) return this.typeNode.reduce();
        else if (this.export) return this.export.reduce();
    }
}

export class FunctionDeclaration extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.name = this.functionNameToken.image;
        node.registerLocation('name', this.functionNameToken.getLocation());
        node.returnType = this.returnType.reduce();
        if (this.typeParamList) node.typeParams = this.typeParamList.reduce();
        node.params = this.params.reduce();
        node.body = this.functionBody.reduce();
        return node;
    }

    resolveType(typeChecker, module) {
        // resolve types of parameters and return type
        const paramTypes = this.params.map(p => p.resolveType(typeChecker, module));
        const returnType = this.returnType.resolveType(typeChecker, module);
        // the type of the function will be unknown if any component types are unknown, otherwise it has a function type
        if (paramTypes.some(t => t instanceof TUnknown) || returnType instanceof TUnknown) this.type = new TUnknown();
        else this.type = new TFunction(paramTypes, returnType);
        // create a symbol table initialized to contain the parameters
        const symbolTable = {};
        for (let i = 0; i < this.params.length; ++i) {
            symbolTable[this.params[i].name] = paramTypes[i];
        }
        // type check the function body, passing along the starting symbol table and the return type of the function as the expected type of the body
        const actualReturnType = this.body.resolveType(typeChecker, module, symbolTable);
        if (!(returnType instanceof TUnknown) && !returnType.isAssignableFrom(actualReturnType)) {
            typeChecker.errors.push(new TypeCheckError(mess.TYPE_MISMATCH(actualReturnType, returnType), module.path, this.returnType.locations.self));
        }
        return this.type;
    }
}

export class ParameterList extends ASTNode {
    reduce() {
        // semantically, this is a pointless node, so we just return the list of param nodes directly
        return this.params.map(p => p.reduce());
    }
}

export class Param extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.typeNode = this.typeNode.reduce();
        node.name = this.nameToken.image;
        node.registerLocation('name', this.nameToken.getLocation());
        return node;
    }

    resolveType(typeChecker, module) {
        return this.type = this.typeNode.resolveType(typeChecker, module);
    }
}

export class TypeDeclaration extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.name = this.typeNameToken.image;
        node.registerLocation('name', this.typeNameToken.getLocation());
        if (this.typeParamlist) node.typeParams = this.typeParamList.reduce();
        node.typeNode = this.typeNode.reduce();
        return node;
    }

    resolveType(typeChecker, module) {
        return this.type = this.typeNode.resolveType(typeChecker, module);
    }
}

export class TypeParamList extends ASTNode {
    reduce() {
        // semantically, this is a pointless node, so we just return the list of param nodes directly
        return this.typeParams.map(p => p.reduce());
    }
}

export class TypeParam extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        let start = this.nameToken.getLocation();
        let end = start;
        if (this.varianceOp) {
            const { op, loc } = this.varianceOp.reduce();
            node.varianceOp = op;
            node.registerLocation('variance', loc);
            start = loc;
        }
        node.name = this.nameToken.image;
        node.registerLocation('name', this.nameToken.getLocation());
        if (this.typeConstraint) {
            const { con, loc } = this.typeConstraint.reduce();
            node.typeConstraint = con;
            node.registerLocation('constraint', loc);
            end = loc;
        }
        node.createAndRegisterLocation('self', start, end);
        return node;
    }
}

export class VarianceOp extends ASTNode {
    reduce() {
        if (this.covaraiantToken) {
            return { op: this.covaraiantToken.image, loc: this.covaraiantToken.getLocation() };
        } else {
            return { op: this.contravariantToken.image, loc: this.contravariantToken.getLocation() };
        }
    }
}

export class TypeConstraint extends ASTNode {
    reduce() {
        const { op, opLoc } = this.constraintOp.reduce();
        const type = this.constraintType.reduce();
        return { con: { op, type }, loc: { startLine: opLoc.startLine, endLine: type.locations.self.endLine, startColumn: opLoc.startColumn, endColumn: type.locations.self.endColumn } };
    }
}

export class ConstraintOp extends ASTNode {
    reduce() {
        if (this.assignableToToken) {
            return { op: this.assignableToToken, opLoc: this.assignableToToken.getLocation() };
        } else {
            return { op: this.assignableFromToken, opLoc: this.assignableFromToken.getLocation() };
        }
    }
}

export class FunctionBody extends ASTNode {
    reduce() {
        if (this.blockBody) return this.blockBody.reduce();
        else if (this.expressionBody) return this.expressionBody.reduce();
        else if (this.statementBody) return this.statementBody.reduce();
    }
}

export class ExportDeclaration extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        const { name, loc } = this.exportName.reduce();
        node.name = name;
        node.registerLocation('name', loc);
        node.value = this.exportValue.reduce();
        return node;
    }

    resolveType(typeChecker, module) {
        // empty symbol table
        const symbolTable = {};
        // visit the value of the export, we don't have a resolved type yet so just pass null
        return this.type = this.value.resolveType(typeChecker, module, symbolTable);
    }
}

export class ExportName extends ASTNode {
    reduce() {
        if (this.defaultToken) {
            return { name: 'default', loc: this.defaultToken.getLocation() };
        } else {
            return this.namedExport.reduce();
        }
    }
}

export class NamedExport extends ASTNode {
    reduce() {
        return { name: this.exportNameToken.image, loc: this.exportNameToken.getLocation() };
    }
}

export class ExportValue extends ASTNode {
    reduce() {
        if (this.function) return this.function.reduce();
        if (this.typeNode) return this.typeNode.reduce();
        if (this.expression) return this.expression.reduce();
    }
}
