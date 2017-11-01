import * as decls from './declarations';
import * as types from './types';
import * as stmts from './statements';
import * as exprs from './expressions';


export default interface INodeVisitor<T> {
    // declarations
    visitProgram(program: decls.Program): T;
    visitImportDeclaration(decl: decls.ImportDeclaration): T;
    visitTypeDeclaration(decl: decls.TypeDeclaration): T;
    visitTypeParam(param: decls.TypeParam): T;
    visitFunctionDeclaration(decl: decls.FunctionDeclaration): T;
    visitParam(param: decls.Param): T;
    visitLambdaParam(param: exprs.LambdaParam): T;
    visitExportDeclaration(decl: decls.ExportDeclaration): T;

    // types
    visitPrimitiveType(type: types.PrimitiveType): T;
    visitIdentifierType(type: types.IdentifierType): T;
    visitArrayType(type: types.ArrayType): T;
    visitFunctionType(type: types.FunctionType): T;
    visitParenthesizedType(type: types.ParenthesizedType): T;
    visitSpecificType(type: types.SpecificType): T;
    visitStructType(type: types.StructType): T;
    visitTupleType(type: types.TupleType): T;
    visitUnionType(type: types.UnionType): T;

    // statements
    visitBlock(block: stmts.Block): T;
    visitBreakStatement(stmt: stmts.BreakStatement): T;
    visitContinueStatement(stmt: stmts.ContinueStatement): T;
    visitDoWhileStatement(stmt: stmts.DoWhileStatement): T;
    visitForStatement(stmt: stmts.ForStatement): T;
    visitNoop(stmt: stmts.Noop): T;
    visitReturnStatement(stmt: stmts.ReturnStatement): T;
    visitThrowStatement(stmt: stmts.ThrowStatement): T;
    visitTryCatchStatement(stmt: stmts.TryCatchStatement): T;
    visitWhileStatement(stmt: stmts.WhileStatement): T;

    // expressions
    visitBoolLiteral(lit: exprs.BoolLiteral): T;
    visitCharLiteral(lit: exprs.CharLiteral): T;
    visitFloatLiteral(lit: exprs.FloatLiteral): T;
    visitIntegerLiteral(lit: exprs.IntegerLiteral): T;
    visitStringLiteral(lit: exprs.StringLiteral): T;
    visitIdentifierExpression(exp: exprs.IdentifierExpression): T;
    visitArrayAccess(acc: exprs.ArrayAccess): T;
    visitArrayLiteral(lit: exprs.ArrayLiteral): T;
    visitBinaryExpression(exp: exprs.BinaryExpression): T;
    visitFieldAccess(acc: exprs.FieldAccess): T;
    visitFunctionApplication(app: exprs.FunctionApplication): T;
    visitIfElseExpression(exp: exprs.IfElseExpression): T;
    visitLambdaExpression(exp: exprs.LambdaExpression): T;
    visitParenthesizedExpression(exp: exprs.ParenthesizedExpression): T;
    visitStructLiteral(lit: exprs.StructLiteral): T;
    visitTupleLiteral(lit: exprs.TupleLiteral): T;
    visitUnaryExpression(exp: exprs.UnaryExpression): T;
    visitVarDeclaration(decl: exprs.VarDeclaration): T;
}
