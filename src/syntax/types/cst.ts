import CSTNode from '~/syntax/CSTNode';
import { Token } from '~/parser/Tokenizer';


/**
 * This is the "wrapper" node type for all types.
 * It is stripped away during the reduction process.
 */
export class STTypeNode extends CSTNode {
    choice: Token | STType;
}

export abstract class STType extends CSTNode { }

export class STArrayType extends STType {
    baseType: STTypeNode;
    openBracketToken: Token;
    closeBracketToken: Token;
}

export class STFunctionType extends STType {
    openParenToken: Token;
    paramTypes: STTypeNode[];
    closeParenToken: Token;
    fatArrowToken: Token;
    returnType: STTypeNode;
}

export class STParenthesizedType extends STType {
    openParenToken: Token;
    inner: STTypeNode;
    closeParenToken: Token;
}

export class STSpecificType extends STType {
    nameToken: Token;
    typeArgList: STTypeArgList;
}

export class STTypeArgList extends CSTNode {
    openLtToken: Token;
    closeGtToken: Token;
    types: STTypeNode[];
}

export class STStructType extends STType {
    openBraceToken: Token;
    fields: STField[];
    closeBraceToken: Token;
}

export class STField extends CSTNode {
    typeNode: STTypeNode;
    nameToken: Token;
}

export class STTupleType extends STType {
    openParenToken: Token;
    types: STTypeNode[];
    closeParenToken: Token;
}

export class STUnionType extends STType {
    left: STTypeNode;
    vbarToken: Token;
    right: STTypeNode;
}
