import ASTNode from './ASTNode';


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
        node.type = this.type.reduce();
        node.name = this.identifierToken.image;
        node.registerLocation('name', this.identifierToken.getLocation());
        return node;
    }
}

export class TypeDeclaration extends ASTNode {
    reduce() {
        const node = this._createNewNode();
        node.name = this.typeNameToken.image;
        node.registerLocation('name', this.typeNameToken.getLocation());
        node.type = this.type.reduce();
        return node;
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
}
