import CSTNode from '~/syntax/CSTNode';
import { Token } from '~/parser/Tokenizer';
import { STTypeArgList } from '~/syntax/types/cst';
import { STParam, STFunctionBody } from '~/syntax/declarations/cst';


export class STExpressionNode extends CSTNode {
    choice: Token | STExpression;
}

export class STExpression extends CSTNode {}

export class STArrayAccess extends STExpression {
    target: STExpressionNode;
    openBracketToken: Token;
    indexExp: STExpressionNode;
    closeBracketToken: Token;
}

export class STArrayLiteral extends STExpression {
    openBracketToken: Token;
    items: STExpressionNode[];
    closeBracketToken: Token;
}

export class STBinaryExpression extends STExpression {
    operatorToken: Token;
    left: STExpressionNode;
    right: STExpressionNode;
}

export class STFieldAccess extends STExpression {
    target: STExpressionNode;
    dotToken: Token;
    fieldNameToken: Token;
}

export class STFunctionApplication extends STExpression {
    target: STExpressionNode;
    typeArgList: STTypeArgList;
    openParenToken: Token;
    args: STExpressionNode[];
    closeParenToken: Token;
}

export class STIfElseExpression extends STExpression {
    ifToken: Token;
    openParenToken: Token;
    condition: STExpressionNode;
    closeParenToken: Token;
    consequent: STExpressionNode;
    elseToken: Token;
    alternate: STExpressionNode;
}

export class STLambdaExpression extends STExpression {
    openParenToken?: Token;
    shorthandParam?: Token;
    params: STLambdaParam[];
    closeParenToken?: Token;
    fatArrowToken: Token;
    functionBody: STFunctionBody;
}

export class STLambdaParam extends CSTNode {
    choice: STParam | Token;
}

export class STParenthesizedExpression extends STExpression {
    openParenToken: Token;
    inner: STExpressionNode;
    closeParenToken: Token;
}

export class STStructLiteral extends STExpression {
    openBraceToken: Token;
    entries: STStructEntry[];
    closeBraceToken: Token;
}

export class STStructEntry extends CSTNode {
    keyToken: Token;
    colonToken: Token;
    value: STExpressionNode;
}

export class STTupleLiteral extends STExpression {
    openParenToken: Token;
    items: STExpressionNode[];
    closeParenToken: Token;
}

export class STUnaryExpression extends STExpression {
    operatorToken: Token;
    target: STExpressionNode;
}

export class STPrefixExpression extends STUnaryExpression {}

export class STPostfixExpression extends STUnaryExpression {}

export class STVarDeclaration extends STExpression {
    varIdentToken: Token;
    equalsToken: Token;
    initialValue: STExpressionNode;
}
