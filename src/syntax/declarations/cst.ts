import CSTNode from '../CSTNode';
import { Token } from '../../parser/Tokenizer';
import { STTypeNode } from '../types/cst';
import { STStatementNode, STBlock } from '../statements/cst';
import { STExpressionNode } from '../expressions/cst';


export class STProgram extends CSTNode {
    imports: STImportDeclaration[];
    declarations: STDeclaration[];
    eof: Token;
}

export class STDeclaration extends CSTNode {
    choice: STFunctionDeclaration | STTypeDeclaration | STExportDeclaration;
}

export class STImportDeclaration extends CSTNode {
    importToken: Token;
    fromToken: Token;
    moduleNameToken: Token;
    colonToken: Token;
    imports: STImportList;
}

export class STImportList extends CSTNode {
    choice: Token | STNamedImports;
}

export class STNamedImports extends CSTNode {
    openBraceToken: Token;
    importComponents: STImportComponent[];
    closeBraceToken: Token;
}

export class STImportComponent extends CSTNode {
    choice: Token | STImportWithAlias;
}

export class STImportWithAlias extends CSTNode {
    importNameToken: Token;
    asToken: Token;
    importAliasToken: Token;
}

export class STTypeDeclaration extends CSTNode {
    typeToken: Token;
    typeNameToken: Token;
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
    functionNameToken: Token;
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

export class STExportDeclaration extends CSTNode {
    exportToken: Token;
    exportName: STExportName;
    exportValue: STExportValue;
}

export class STExportName extends CSTNode {
    choice: Token | STNamedExport;
}

export class STNamedExport extends CSTNode {
    exportNameToken: Token;
    equalsToken: Token;
}

export class STExportValue extends CSTNode {
    choice: STFunctionDeclaration | STTypeDeclaration | STExpressionNode;
}
