import ASTNode from './ASTNode';


export class Program extends ASTNode { }

export class ImportDeclaration extends ASTNode {
    constructor(props, children) {
        super(props, children);
        // extract module name
        this.moduleName = this.moduleNameToken.value;
        // extract import names and aliases
        this.importNames = {};
        if (this.defaultImport) {
            this.importNames.default = this.defaultImportNameToken.value;
        } else {
            for (const comp of this.importComponents) {
                this.importNames[comp.importName] = comp.importAlias;
            }
        }
    }
}

export class ImportComponent extends ASTNode {
    constructor(props, children) {
        super(props, children);
        this.importName = this.importNameToken.value;
        this.importAlias = this.importAliasToken ? this.importAliasToken.value : this.importName;
    }
}

export class FunctionDeclaration extends ASTNode {
    constructor(props, children) {
        super(props, children);
        this.functionName = this.functionNameToken.image;
    }
}

export class ParameterList extends ASTNode { }

export class Param extends ASTNode { }

export class TypeDeclaration extends ASTNode { }

export class ExportDeclaration extends ASTNode { }
