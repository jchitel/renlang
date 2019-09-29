import * as ast from '~/syntax/statements';


/**
 * A visitor type for only statement node types
 */
export default interface IStatementVisitor<T> {
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
}
