import CSTNode from '~/syntax/CSTNode';
import { Token } from '~/parser/Tokenizer';
import { STTypeNode } from '~/syntax/types/cst';
import { STStatementNode, STBlock } from '~/syntax/statements/cst';
import { STExpressionNode } from '~/syntax/expressions/cst';


export class STProgram extends CSTNode {
    imports: STImportDeclaration[];
    declarations: STNonImportDeclaration[];
    eof: Token;
}

export class STDeclaration extends CSTNode {
    choice: STFunctionDeclaration | STTypeDeclaration | STConstantDeclaration;
}

export class STNonImportDeclaration extends CSTNode {
    choice: STDeclaration | STExportDeclaration | STExportForwardDeclaration;
}

export class STImportDeclaration extends CSTNode {
    importToken: Token;
    fromToken: Token;
    moduleNameToken: Token;
    colonToken: Token;
    imports: STImportList;
}

export class STImportList extends CSTNode {
    choice: Token | STNamedImports | STDefaultAndNamedImports | STWildcardImport | STDefaultAndWildcardImports;
}

export class STNamedImports extends CSTNode {
    openBraceToken: Token;
    importComponents: STImportComponent[];
    closeBraceToken: Token;
}

export class STImportComponent extends CSTNode {
    choice: Token | STImportWithAlias | STWildcardImport;
}

export class STImportWithAlias extends CSTNode {
    importNameToken: Token;
    asToken: Token;
    importAliasToken: Token;
}

export class STWildcardImport extends CSTNode {
    multiplyToken: Token;
    asToken: Token;
    wildcardAliasToken: Token;
}

export class STDefaultAndNamedImports extends CSTNode {
    defaultImportNameToken: Token;
    commaToken: Token;
    imports: STNamedImports;
}

export class STDefaultAndWildcardImports extends CSTNode {
    defaultImportNameToken: Token;
    commaToken: Token;
    wildcard: STWildcardImport;
}

export class STTypeDeclaration extends CSTNode {
    typeToken: Token;
    typeNameToken?: Token;
    typeParamList?: STTypeParamList;
    equalsToken: Token;
    typeNode: STTypeNode;
}

export class STTypeParamList extends CSTNode {
    openLtToken: Token;
    typeParams: STTypeParam[];
    closeGtToken: Token;
}

export class STTypeParam extends CSTNode {
    nameToken: Token;
    varianceOp: STVarianceOp;
    typeConstraint: STTypeConstraint;
}

export class STVarianceOp extends CSTNode {
    choice: Token;
}

export class STTypeConstraint extends CSTNode {
    colonToken: Token;
    constraintType: STTypeNode;
}

export class STFunctionDeclaration extends CSTNode {
    funcToken: Token;
    returnType: STTypeNode;
    functionNameToken?: Token;
    typeParamList: STTypeParamList;
    paramsList: STParameterList;
    fatArrowToken: Token;
    functionBody: STFunctionBody;
}

export class STParameterList extends CSTNode {
    openParenToken: Token;
    params: STParam[];
    closeParenToken: Token;
}

export class STParam extends CSTNode {
    typeNode: STTypeNode;
    nameToken: Token;
}

export class STFunctionBody extends CSTNode {
    choice: STBlock | STExpressionNode | STStatementNode;
}

export class STConstantDeclaration extends CSTNode {
    constToken: Token;
    identToken?: Token;
    equalsToken: Token;
    exp: STExpressionNode;
}

export class STExportDeclaration extends CSTNode {
    choice: STDefaultExportDeclaration | STNamedExportDeclaration;
}

export class STDefaultExportDeclaration extends CSTNode {
    exportToken: Token;
    defaultToken: Token;
    value: STDefaultExportValue;
}

export class STDefaultExportValue extends CSTNode {
    choice: STDeclaration | Token;
}

export class STNamedExportDeclaration extends CSTNode {
    exportToken: Token;
    value: STNamedExportValue;
}

export class STNamedExportValue extends CSTNode {
    choice: STDeclaration | STNamedExports;
}

export class STNamedExports extends CSTNode {
    openBraceToken: Token;
    exports: STExportComponent[];
    closeBraceToken: Token;
}

export class STExportComponent extends CSTNode {
    choice: Token | STImportWithAlias;
}

export class STExportForwardDeclaration extends CSTNode {
    choice: STDefaultExportForwardDeclaration | STNamedExportForwardDeclaration;
}

export class STNamedExportForwardDeclaration extends CSTNode {
    exportToken: Token;
    fromToken: Token;
    moduleNameToken: Token;
    colonToken: Token;
    forwards: STNamedExportForwards;
}

export class STNamedExportForwards extends CSTNode {
    choice: STImportList | Token;
}

export class STDefaultExportForwardDeclaration extends CSTNode {
    exportToken: Token;
    defaultToken: Token;
    fromToken: Token;
    moduleNameToken: Token;
    suffix?: STDefaultExportForwardSuffix;
}

export class STDefaultExportForwardSuffix extends CSTNode {
    colonToken: Token;
    forwards: STDefaultExportForwards;
}

export class STDefaultExportForwards extends CSTNode {
    choice: STDefaultNamedExportForward | Token;
}

export class STDefaultNamedExportForward extends CSTNode {
    openBraceToken: Token;
    forwardNameToken: Token;
    closeBraceToken: Token;
}
