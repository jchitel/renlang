import ASTNode from './ASTNode';


export class Expression extends ASTNode { }

export class ArrayLiteral extends ASTNode { }

export class TupleLiteral extends ASTNode { }

export class StructLiteral extends ASTNode { }

export class LambdaExpression extends ASTNode { }

export class LambdaParamList extends ASTNode { }

export class LambdaParam extends ASTNode { }

export class UnaryExpression extends ASTNode { }

export class BinaryExpression extends ASTNode { }

export class IfElseExpression extends ASTNode { }

export class VarDeclaration extends ASTNode { }

export class FunctionApplication extends ASTNode { }

export class FieldAccess extends ASTNode { }

export class ArrayAccess extends ASTNode { }
