import INodeVisitor from '~/syntax/INodeVisitor';
import ASTNode from '~/syntax/ASTNode';
import Parser from '~/parser/Parser';
import * as ast from '~/syntax';


export class TestVisitor implements INodeVisitor<any> {
    visitProgram(_program: ast.Program) {}
    visitImportDeclaration(_decl: ast.ImportDeclaration) {}
    visitTypeDeclaration(_decl: ast.TypeDeclaration) {}
    visitTypeParam(_param: ast.TypeParam) {}
    visitFunctionDeclaration(_decl: ast.FunctionDeclaration) {}
    visitParam(_param: ast.Param) {}
    visitLambdaParam(_param: ast.LambdaParam) {}
    visitConstantDeclaration(_decl: ast.ConstantDeclaration) {}
    visitExportDeclaration(_decl: ast.ExportDeclaration) {}
    visitExportForwardDeclaration(_decl: ast.ExportForwardDeclaration) {}
    visitBuiltInType(_type: ast.BuiltInType) {}
    visitIdentifierType(_type: ast.IdentifierType) {}
    visitArrayType(_type: ast.ArrayType) {}
    visitFunctionType(_type: ast.FunctionType) {}
    visitParenthesizedType(_type: ast.ParenthesizedType) {}
    visitSpecificType(_type: ast.SpecificType) {}
    visitStructType(_type: ast.StructType) {}
    visitTupleType(_type: ast.TupleType) {}
    visitUnionType(_type: ast.UnionType) {}
    visitNamespaceAccessType(_type: ast.NamespaceAccessType) {}
    visitBlock(_block: ast.Block) {}
    visitExpressionStatement(_exp: ast.ExpressionStatement) {}
    visitBreakStatement(_stmt: ast.BreakStatement) {}
    visitContinueStatement(_stmt: ast.ContinueStatement) {}
    visitDoWhileStatement(_stmt: ast.DoWhileStatement) {}
    visitForStatement(_stmt: ast.ForStatement) {}
    visitReturnStatement(_stmt: ast.ReturnStatement) {}
    visitThrowStatement(_stmt: ast.ThrowStatement) {}
    visitTryCatchStatement(_stmt: ast.TryCatchStatement) {}
    visitWhileStatement(_stmt: ast.WhileStatement) {}
    visitBoolLiteral(_lit: ast.BoolLiteral) {}
    visitCharLiteral(_lit: ast.CharLiteral) {}
    visitFloatLiteral(_lit: ast.FloatLiteral) {}
    visitIntegerLiteral(_lit: ast.IntegerLiteral) {}
    visitStringLiteral(_lit: ast.StringLiteral) {}
    visitIdentifierExpression(_exp: ast.IdentifierExpression) {}
    visitArrayAccess(_acc: ast.ArrayAccess) {}
    visitArrayLiteral(_lit: ast.ArrayLiteral) {}
    visitBinaryExpression(_exp: ast.BinaryExpression) {}
    visitFieldAccess(_acc: ast.FieldAccess) {}
    visitFunctionApplication(_app: ast.FunctionApplication) {}
    visitIfElseExpression(_exp: ast.IfElseExpression) {}
    visitLambdaExpression(_exp: ast.LambdaExpression) {}
    visitParenthesizedExpression(_exp: ast.ParenthesizedExpression) {}
    visitStructLiteral(_lit: ast.StructLiteral) {}
    visitTupleLiteral(_lit: ast.TupleLiteral) {}
    visitUnaryExpression(_exp: ast.UnaryExpression) {}
    visitVarDeclaration(_decl: ast.VarDeclaration) {}
}

export function mock<T>(cls: Class<T>, props: Partial<T> = {}): T {
    return Object.assign(Object.create(cls.prototype), props);
}

export function createParser<T extends ASTNode>(cls: Class<T>): (source: string) => T {
    return (source) => new Parser(source).parse(cls) as T;
}
