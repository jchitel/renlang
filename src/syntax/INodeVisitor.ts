import * as ast from '.';


export default interface INodeVisitor<T> {
    // declarations
    visitProgram(program: ast.Program): T;
    visitImportDeclaration(decl: ast.ImportDeclaration): T;
    visitTypeDeclaration(decl: ast.TypeDeclaration): T;
    visitTypeParam(param: ast.TypeParam): T;
    visitFunctionDeclaration(decl: ast.FunctionDeclaration): T;
    visitParam(param: ast.Param): T;
    visitLambdaParam(param: ast.LambdaParam): T;
    visitConstantDeclaration(decl: ast.ConstantDeclaration): T;
    visitExportDeclaration(decl: ast.ExportDeclaration): T;
    visitExportForwardDeclaration(decl: ast.ExportForwardDeclaration): T;

    // types
    visitBuiltInType(type: ast.BuiltInType): T;
    visitIdentifierType(type: ast.IdentifierType): T;
    visitArrayType(type: ast.ArrayType): T;
    visitFunctionType(type: ast.FunctionType): T;
    visitParenthesizedType(type: ast.ParenthesizedType): T;
    visitSpecificType(type: ast.SpecificType): T;
    visitStructType(type: ast.StructType): T;
    visitTupleType(type: ast.TupleType): T;
    visitUnionType(type: ast.UnionType): T;
    visitNamespaceAccessType(type: ast.NamespaceAccessType): T;

    // statements
    visitBlock(block: ast.Block): T;
    visitExpressionStatement(exp: ast.ExpressionStatement): T;
    visitBreakStatement(stmt: ast.BreakStatement): T;
    visitContinueStatement(stmt: ast.ContinueStatement): T;
    visitDoWhileStatement(stmt: ast.DoWhileStatement): T;
    visitForStatement(stmt: ast.ForStatement): T;
    visitReturnStatement(stmt: ast.ReturnStatement): T;
    visitThrowStatement(stmt: ast.ThrowStatement): T;
    visitTryCatchStatement(stmt: ast.TryCatchStatement): T;
    visitWhileStatement(stmt: ast.WhileStatement): T;

    // expressions
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
