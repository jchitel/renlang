import CSTNode from '../CSTNode';
import { Token, ILocation } from '../../parser/Tokenizer';
import {
    Program, ImportDeclaration, TypeDeclaration, TypeParam, FunctionDeclaration, Param,
    ExportDeclaration
} from './ast';
import { Type } from '../types/ast';
import { STType } from '../types/cst';
import { Statement } from '../statements/ast';
import { STStatement, STBlock } from '../statements/cst';
import { Expression } from '../expressions/ast';
import { STExpression } from '../expressions/cst';


export class STProgram extends CSTNode<Program> {
    imports: STImportDeclaration[];
    declarations: STDeclaration[];
    eof: Token;

    reduce() {
        const node = new Program();
        node.imports = this.imports.map(i => i.reduce());
        const decls = this.declarations.map(d => d.reduce());
        for (const d of decls) {
            if (d instanceof FunctionDeclaration) {
                node.functions.push(d);
            } else if (d instanceof TypeDeclaration) {
                node.types.push(d);
            } else {
                node.exports.push(d);
            }
        }
        return node;
    }
}

export class STDeclaration extends CSTNode<FunctionDeclaration | TypeDeclaration | ExportDeclaration> {
    choice: STFunctionDeclaration | STTypeDeclaration | STExportDeclaration;

    reduce(): FunctionDeclaration | TypeDeclaration | ExportDeclaration {
        return this.choice.reduce();
    }
}

type ImportTokens = {
    name: Token;
    alias: Token;
    isDefault?: boolean;
};

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

export class STTypeDeclaration extends CSTNode<TypeDeclaration> {
    typeToken: Token;
    typeNameToken: Token;
    typeParamList?: STTypeParamList;
    equalsToken: Token;
    typeNode: STType;

    reduce() {
        const node = new TypeDeclaration();
        node.name = this.typeNameToken.image;
        node.registerLocation('name', this.typeNameToken.getLocation());
        if (this.typeParamList) node.typeParams = this.typeParamList.reduce();
        node.typeNode = this.typeNode.reduce();
        return node;
    }
}

export class STTypeParamList extends CSTNode<TypeParam[]> {
    openLtToken: Token;
    typeParams: STTypeParam[];
    closeGtToken: Token;

    reduce() {
        // semantically, this is a pointless node, so we just return the list of param nodes directly
        return this.typeParams.map(p => p.reduce());
    }
}

export class STTypeParam extends CSTNode<TypeParam> {
    nameToken: Token;
    varianceOp: STVarianceOp;
    typeConstraint: STTypeConstraint;

    reduce() {
        const node = new TypeParam();
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
            const { typeNode, loc } = this.typeConstraint.reduce();
            node.typeConstraint = typeNode;
            node.registerLocation('constraint', loc);
            end = loc;
        }
        node.createAndRegisterLocation('self', start, end);
        return node;
    }
}

export class STVarianceOp extends CSTNode<{ op: string, loc: ILocation }> {
    covariantToken: Token;
    contravariantToken: Token;

    reduce() {
        const tok = this.covariantToken || this.contravariantToken;
        return { op: tok.image, loc: tok.getLocation() };
    }
}

export class STTypeConstraint extends CSTNode<{ typeNode: Type, loc: ILocation }> {
    colonToken: Token;
    constraintType: STType;

    reduce() {
        const opLoc = this.colonToken.getLocation();
        const typeNode = this.constraintType.reduce();
        return {
            typeNode,
            loc: {
                startLine: opLoc.startLine,
                endLine: typeNode.locations.self.endLine,
                startColumn: opLoc.startColumn,
                endColumn: typeNode.locations.self.endColumn,
            },
        };
    }
}

export class STFunctionDeclaration extends CSTNode<FunctionDeclaration> {
    funcToken: Token;
    returnType: STType;
    functionNameToken: Token;
    typeParamList: STTypeParamList;
    paramsList: STParameterList;
    fatArrowToken: Token;
    functionBody: STFunctionBody;

    reduce() {
        const node = new FunctionDeclaration();
        node.name = this.functionNameToken.image;
        node.registerLocation('name', this.functionNameToken.getLocation());
        node.returnType = this.returnType.reduce();
        if (this.typeParamList) node.typeParams = this.typeParamList.reduce();
        node.params = this.paramsList.reduce();
        node.body = this.functionBody.reduce();
        node.createAndRegisterLocation('self', node.locations.name, node.body.locations.self);
        return node;
    }
}

export class STParameterList extends CSTNode<Param[]> {
    openParenToken: Token;
    params: STParam[];
    closeParenToken: Token;

    reduce() {
        // semantically, this is a pointless node, so we just return the list of param nodes directly
        return this.params.map(p => p.reduce());
    }
}

export class STParam extends CSTNode<Param> {
    typeNode: STType;
    nameToken: Token;

    reduce() {
        const node = new Param();
        node.typeNode = this.typeNode.reduce();
        node.name = this.nameToken.image;
        node.registerLocation('name', this.nameToken.getLocation());
        return node;
    }
}

export class STFunctionBody extends CSTNode<Statement | Expression> {
    blockBody: STBlock;
    expressionBody: STExpression;
    statementBody: STStatement;

    reduce() {
        if (this.blockBody) return this.blockBody.reduce();
        else if (this.expressionBody) return this.expressionBody.reduce();
        else if (this.statementBody) return this.statementBody.reduce();
        else throw new Error('this should never happen');
    }
}

export class STExportDeclaration extends CSTNode<ExportDeclaration> {
    exportToken: Token;
    exportName: STExportName;
    exportValue: STExportValue;

    reduce() {
        const node = new ExportDeclaration();
        const { name, loc } = this.exportName.reduce();
        node.name = name;
        node.registerLocation('name', loc);
        node.value = this.exportValue.reduce();
        node.createAndRegisterLocation('self', node.locations.name, node.value.locations.self);
        return node;
    }
}

export class STExportName extends CSTNode<{ name: string, loc: ILocation }> {
    defaultToken: Token;
    namedExport: STNamedExport;

    reduce() {
        if (this.defaultToken) {
            return { name: 'default', loc: this.defaultToken.getLocation() };
        } else {
            return this.namedExport.reduce();
        }
    }
}

export class STNamedExport extends CSTNode<{ name: string, loc: ILocation }> {
    exportNameToken: Token;
    equalsToken: Token;

    reduce() {
        return {
            name: this.exportNameToken.image,
            loc: this.exportNameToken.getLocation(),
        };
    }
}

export class STExportValue extends CSTNode<FunctionDeclaration | TypeDeclaration | Expression> {
    function: STFunctionDeclaration;
    typeNode: STTypeDeclaration;
    expression: STExpression;

    reduce() {
        if (this.function) return this.function.reduce();
        if (this.typeNode) return this.typeNode.reduce();
        if (this.expression) return this.expression.reduce();
        else throw new Error('this should never happen');
    }
}