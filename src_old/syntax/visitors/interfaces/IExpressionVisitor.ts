import * as ast from '~/syntax/expressions';


/**
 * A visitor type for only expression node types
 */
export default interface IExpressionVisitor<T> {
    visitBoolLiteral(lit: ast.BoolLiteral): T;
    visitCharLiteral(lit: ast.CharLiteral): T;
    visitFloatLiteral(lit: ast.FloatLiteral): T;
    visitIntegerLiteral(lit: ast.IntegerLiteral): T;
    visitStringLiteral(lit: ast.StringLiteral): T;
    visitIdentifierExpression(exp: ast.IdentifierExpression): T;
    visitArrayAccess(acc: ast.ArrayAccess): T;
    visitArrayLiteral(lit: ast.ArrayLiteral): T;
    visitBinaryExpression(exp: ast.BinaryExpression): T;
    visitFieldAccess(acc: ast.FieldAccess): T;
    visitFunctionApplication(app: ast.FunctionApplication): T;
    visitIfElseExpression(exp: ast.IfElseExpression): T;
    visitLambdaExpression(exp: ast.BaseLambdaExpression): T;
    visitParenthesizedExpression(exp: ast.ParenthesizedExpression): T;
    visitStructLiteral(lit: ast.StructLiteral): T;
    visitTupleLiteral(lit: ast.TupleLiteral): T;
    visitUnaryExpression(exp: ast.UnaryExpression): T;
    visitVarDeclaration(decl: ast.VarDeclaration): T;
}
