import ASTNode from './ASTNode';
import { TFunction, TUnknown } from '../typecheck/types';
import TypeCheckError from '../typecheck/TypeCheckError';
import * as mess from '../typecheck/TypeCheckerMessages';


export class Program extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.imports = this.imports.map(i => i.reduce());
        node.exports = this.exports.map(e => e.reduce());
        node.types = this.types.map(t => t.reduce());
        node.functions = this.functions.map(f => f.reduce());
        return node;
    }
}

export class ImportDeclaration extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.moduleName = this.moduleNameToken.value;
        node.registerLocation('moduleName', this.moduleNameToken.getLocation());
        node.importNames = {};
        if (this.defaultImport) {
            node.importNames.default = this.defaultImportNameToken.image;
            node.registerLocation('import_default', this.defaultImportNameToken.getLocation());
            node.registerLocation('importName_default', node.locations.import_default);
            node.registerLocation('importAlias_default', node.locations.import_default);
        } else {
            for (const comp of this.importComponents.map(c => c.reduce())) {
                node.importNames[comp.name] = comp.alias;
                node.registerLocation(`import_${comp.name}`, comp.locations.self);
                node.registerLocation(`importName_${comp.name}`, comp.locations.name);
                node.registerLocation(`importAlias_${comp.name}`, comp.locations.alias);
            }
        }
        return node;
    }
}

export class ImportList extends ASTNode {}

export class NamedImports extends ASTNode {}

export class ImportComponent extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.name = this.importNameToken.image;
        node.registerLocation('name', this.importNameToken.getLocation());
        node.alias = this.importAliasToken ? this.importAliasToken.image : node.name;
        node.registerLocation('alias', this.importAliasToken ? this.importAliasToken.getLocation() : node.locations.name);
        node.createAndRegisterLocation('self', node.locations.name, node.locations.alias);
        return node;
    }
}

export class ImportWithAlias extends ASTNode {}

export class FunctionDeclaration extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.name = this.functionNameToken.image;
        node.registerLocation('name', this.functionNameToken.getLocation());
        node.returnType = this.returnType.reduce();
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
        node.typeNode = this.type.reduce();
        node.name = this.identifierToken.image;
        node.registerLocation('name', this.identifierToken.getLocation());
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
        node.typeNode = this.type.reduce();
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

export class ExportDeclaration extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.name = this.defaultToken ? 'default' : this.exportName.image;
        node.registerLocation('name', this.defaultToken ? this.defaultToken.getLocation() : this.exportName.getLocation());
        if (this.exportedValue) node.value = this.exportedValue.reduce();
        return node;
    }

    resolveType(typeChecker, module) {
        // empty symbol table
        const symbolTable = {};
        // visit the value of the export, we don't have a resolved type yet so just pass null
        return this.type = this.value.resolveType(typeChecker, module, symbolTable);
    }
}
