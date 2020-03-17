use super::declarations::visitors as decl;
use super::expressions::visitors as expr;
use super::statements::visitors as stmt;
use super::types::visitors as typs;


/**
 * Describes a visitor for a specific set of node types.
 * This visitor type is designed to work in a pure functional manner,
 * so each visitor accepts a node of the given type and a value,
 * and should return some other value (of the same type as the parameter by default).
 * For example, a type checking visitor might be:
 * 
 * type TypeCheckVisitor = NodeVisitor<TypeChecker>;
 * 
 * And then each visitor function would be defined as:
 * 
 * const visitor: TypeCheckVisitor = {
 *     ...
 *     [SyntaxType.Something]: (node: Something, checker: TypeChecker): TypeChecker => { ... }
 *     ...
 * };
 * 
 * so the input checker would do some processing based on the node,
 * and return a new checker incorporating that node.
 * 
 * This generic Visitor type can visit any set of node types;
 * the other types exported by this module are predefined for the
 * known sets of node types.
 */
pub trait SyntaxVisitor<P, R = P>:
    DeclarationVisitor<P, R> +
    ExpressionVisitor<P, R> +
    StatementVisitor<P, R> +
    TypeVisitor<P, R> {}

pub trait DeclarationVisitor<P, R = P>:
    decl::ConstantDeclarationVisitor<P, R> +
    decl::AnonymousConstantDeclarationVisitor<P, R> +
    decl::ExportDeclarationVisitor<P, R> +
    decl::ExportForwardDeclarationVisitor<P, R> +
    decl::FunctionDeclarationVisitor<P, R> +
    decl::AnonymousFunctionDeclarationVisitor<P, R> +
    decl::ImportDeclarationVisitor<P, R> +
    decl::NamespaceDeclarationVisitor<P, R> +
    decl::AnonymousNamespaceDeclarationVisitor<P, R> +
    decl::TypeDeclarationVisitor<P, R> +
    decl::AnonymousTypeDeclarationVisitor<P, R> {}

pub trait ExpressionVisitor<P, R = P>:
    expr::ArrayAccessVisitor<P, R> +
    expr::ArrayLiteralVisitor<P, R> +
    expr::BinaryExpressionVisitor<P, R> +
    expr::BoolLiteralVisitor<P, R> +
    expr::CharLiteralVisitor<P, R> +
    expr::FieldAccessVisitor<P, R> +
    expr::FloatLiteralVisitor<P, R> +
    expr::FunctionApplicationVisitor<P, R> +
    expr::IdentifierExpressionVisitor<P, R> +
    expr::IfElseExpressionVisitor<P, R> +
    expr::IntegerLiteralVisitor<P, R> +
    expr::LambdaExpressionVisitor<P, R> +
    expr::ParenthesizedExpressionVisitor<P, R> +
    expr::StringLiteralVisitor<P, R> +
    expr::StructLiteralVisitor<P, R> +
    expr::TupleLiteralVisitor<P, R> +
    expr::UnaryExpressionVisitor<P, R> +
    expr::VarDeclarationVisitor<P, R> {}

pub trait StatementVisitor<P, R = P>:
    stmt::BlockVisitor<P, R> +
    stmt::BreakStatementVisitor<P, R> +
    stmt::ContinueStatementVisitor<P, R> +
    stmt::DoWhileStatementVisitor<P, R> +
    stmt::ExpressionStatementVisitor<P, R> +
    stmt::ForStatementVisitor<P, R> +
    stmt::ReturnStatementVisitor<P, R> +
    stmt::ThrowStatementVisitor<P, R> +
    stmt::TryCatchStatementVisitor<P, R> +
    stmt::WhileStatementVisitor<P, R> {}

pub trait TypeVisitor<P, R = P>:
    typs::ArrayTypeVisitor<P, R> +
    typs::BuiltInTypeVisitor<P, R> +
    typs::FunctionTypeVisitor<P, R> +
    typs::IdentifierTypeVisitor<P, R> +
    typs::NamespaceAccessTypeVisitor<P, R> +
    typs::ParenthesizedTypeVisitor<P, R> +
    typs::SpecificTypeVisitor<P, R> +
    typs::StructTypeVisitor<P, R> +
    typs::TupleTypeVisitor<P, R> +
    typs::UnionTypeVisitor<P, R> {}

