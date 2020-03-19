use crate::parser::parser_new::ParseOperation;
use crate::core::FileRange;
use std::any::Any;

//mod declarations;
//pub mod environment;
//mod expressions;
mod module_root;
//mod parsing;
//mod statements;
//mod types;
//mod visitor;

//pub use environment::Node;
//pub use types::*;
//pub use expressions::*;
//pub use statements::*;
//pub use declarations::*;
//pub use module_root::ModuleRoot;

//pub use environment::{ Declaration, AnonymousDeclaration, Type, Expression, Statement };

//pub use visitor::*;

pub trait Syntax: Any + Sized {
    fn parse_func() -> Box<dyn ParseOperation<Self>>;
}

pub trait SyntaxNode {
    fn location(&self) -> FileRange;
    fn syntax_type(&self) -> SyntaxType;
}

/// The full enumeration of types of syntax nodes in the language.
pub enum SyntaxType {
    // #region module
    ModuleRoot,
    ImportDeclaration,
    ExportDeclaration,
    ExportForwardDeclaration,
    // #endregion
    // #region declarations
    TypeDeclaration,
    AnonymousTypeDeclaration,
    FunctionDeclaration,
    AnonymousFunctionDeclaration,
    ConstantDeclaration,
    AnonymousConstantDeclaration,
    NamespaceDeclaration,
    AnonymousNamespaceDeclaration,
    // #endregion
    // #region types
    BuiltInType,
    StructType,
    TupleType,
    ArrayType,
    FunctionType,
    UnionType,
    IdentifierType,
    ParenthesizedType,
    SpecificType,
    NamespaceAccessType,
    // #endregion
    // #region expressions
    IntegerLiteral,
    FloatLiteral,
    CharLiteral,
    BoolLiteral,
    StringLiteral,
    StructLiteral,
    TupleLiteral,
    ArrayLiteral,
    IdentifierExpression,
    ParenthesizedExpression,
    VarDeclaration,
    UnaryExpression,
    BinaryExpression,
    FunctionApplication,
    ArrayAccess,
    FieldAccess,
    IfElseExpression,
    LambdaExpression,
    // #endregion
    // #region statements
    Block,
    ExpressionStatement,
    ForStatement,
    WhileStatement,
    DoWhileStatement,
    TryCatchStatement,
    ReturnStatement,
    ThrowStatement,
    BreakStatement,
    ContinueStatement,
    // #endregion
    // #region other
    TypeParam,
    Param,
    // #endregion
}

pub mod environment {
    pub struct SyntaxEnvironment;
}
pub struct ImportDeclaration;
pub struct ExportDeclaration;
pub struct ExportForwardDeclaration;
pub struct Declaration;
pub struct AnonymousDeclaration;
pub struct NamespaceDeclaration;
pub struct FunctionDeclaration;
pub struct TypeDeclaration;
pub struct ConstantDeclaration;
