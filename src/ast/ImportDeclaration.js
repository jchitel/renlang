export default class ImportDeclaration {
    constructor(components) {
        Object.assign(this, components);
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

    get line() {
        return this.importToken.line;
    }

    get column() {
        return this.importToken.column;
    }
}

export class ImportComponent {
    constructor(components) {
        Object.assign(this, components);
        this.importName = this.importNameToken.value;
        this.importAlias = this.importAliasToken ? this.importAliasToken.value : this.importName;
    }
}
