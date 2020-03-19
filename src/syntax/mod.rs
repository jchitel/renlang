use crate::parser::parser_new::{ParseResult, ParseState, ParseFunc};
use crate::parser::primitives::{choice, repeat, eof, RepeatBase};
use crate::{core::{FilePosition, FileRange}, seq};
use std::any::Any;

//mod declarations;
//pub mod environment;
//mod expressions;
//mod module_root;
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
    fn parse_func() -> ParseFunc<Self>;
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

pub struct ModuleRoot {
    location: FileRange,
    imports: Vec<ImportDeclaration>,
    exports: Vec<ExportDeclaration>,
    forwards: Vec<ExportForwardDeclaration>,
    declarations: Vec<Declaration>,
}

impl Syntax for ModuleRoot {
    fn parse_func() -> ParseFunc<Self> {
        transform(
            seq!(
                repeat_zero(non_term::<ImportDeclaration>()),
                repeat_zero(choice::<NonImport>()),
                eof()
            ),
            |(imports, decls, eof)| {
                let start_pos = FilePosition::new(eof.location.path, (0, 0));
                let (exports, forwards, declarations) = decls.sort();
                ModuleRoot {
                    location: start_pos.merge(eof.location),
                    imports,
                    exports,
                    forwards,
                    declarations,
                }
            }
        )
    }

    fn location(&self) -> FileRange { self.location }
    fn syntax_type(&self) -> SyntaxType { SyntaxType::ModuleRoot }
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
