import * as ast from '~/syntax/declarations';
import { LambdaParam } from '~/syntax/expressions';


/**
 * A visitor type for only declaration node types
 */
export default interface IDeclarationVisitor<T> {
    visitModule(program: ast.Module): T;
    visitImportDeclaration(decl: ast.ImportDeclaration): T;
    visitTypeDeclaration(decl: ast.TypeDeclaration): T;
    visitTypeParam(param: ast.TypeParam): T;
    visitFunctionDeclaration(decl: ast.FunctionDeclaration): T;
    visitParam(param: ast.Param): T;
    visitLambdaParam(param: LambdaParam): T;
    visitConstantDeclaration(decl: ast.ConstantDeclaration): T;
    visitExportDeclaration(decl: ast.ExportDeclaration): T;
    visitExportForwardDeclaration(decl: ast.ExportForwardDeclaration): T;
    visitNamespaceDeclaration(decl: ast.NamespaceDeclaration): T;
}
