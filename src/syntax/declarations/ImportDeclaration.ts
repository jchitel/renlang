import { ASTNode, CSTNode } from '../Node';
import { Token } from '../../parser/Tokenizer';
import INodeVisitor from '../INodeVisitor';


type ImportTokens = {
    name: Token;
    alias: Token;
    isDefault?: boolean;
};

export class ImportDeclaration extends ASTNode {
    moduleName: string;
    importNames: { [name: string]: string };
    
    visit<T>(visitor: INodeVisitor<T>) {
        return visitor.visitImportDeclaration(this);
    }
}

export class STImportDeclaration extends CSTNode<ImportDeclaration> {
    importToken: Token;
    fromToken: Token;
    moduleNameToken: Token;
    colonToken: Token;
    imports: STImportList;

    reduce() {
        const node = new ImportDeclaration();
        node.moduleName = this.moduleNameToken.value;
        node.registerLocation('moduleName', this.moduleNameToken.getLocation());
        node.importNames = {};
        for (const { name, alias, isDefault } of this.imports.reduce()) {
            const nameImage = isDefault ? 'default' : name.image;
            node.importNames[nameImage] = alias.image;
            node.createAndRegisterLocation(`import_${nameImage}`, name.getLocation(), alias.getLocation());
            node.registerLocation(`importName_${nameImage}`, name.getLocation());
            node.registerLocation(`importAlias_${nameImage}`, alias.getLocation());
        }
        return node;
    }
}

export class STImportList extends CSTNode<ImportTokens[]> {
    defaultImportNameToken: Token;
    namedImports: STNamedImports;

    reduce(): ImportTokens[] {
        if (this.defaultImportNameToken) {
            return [{ name: this.defaultImportNameToken, alias: this.defaultImportNameToken, isDefault: true }];
        } else {
            return this.namedImports.reduce();
        }
    }
}

export class STNamedImports extends CSTNode<ImportTokens[]> {
    openBraceToken: Token;
    importComponents: STImportComponent[];
    closeBraceToken: Token;

    reduce() {
        return this.importComponents.map(c => c.reduce());
    }
}

export class STImportComponent extends CSTNode<ImportTokens> {
    importNameToken: Token;
    importWithAlias: STImportWithAlias;

    reduce() {
        if (this.importNameToken) {
            return { name: this.importNameToken, alias: this.importNameToken };
        } else {
            return this.importWithAlias.reduce();
        }
    }
}

export class STImportWithAlias extends CSTNode<ImportTokens> {
    importNameToken: Token;
    asToken: Token;
    importAliasToken: Token;

    reduce() {
        return {
            name: this.importNameToken,
            alias: this.importAliasToken,
        };
    }
}
