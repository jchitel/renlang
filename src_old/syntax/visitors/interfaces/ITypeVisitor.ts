import * as ast from '~/syntax/types';


/**
 * A visitor type for only type node types
 */
export default interface ITypeVisitor<T> {
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
}
