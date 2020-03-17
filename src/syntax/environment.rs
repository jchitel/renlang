use crate::core::FileRange;
use crate::parser::{ ParseFunc, Parser, ParseResult, select, seq, repeat };
use super as syntax;
use super::parsing;

/**
 * The full enumeration of types of syntax nodes in the language.
 */
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

/**
 * Our syntax is understandably recursive. The only issue with that is that 
 * JS code doesn't handle circular references very well. It works just fine
 * for types because of multiple passes, but values in JS can only be circularly
 * defined in two instances:
 * 1. Referencing an uninitialized value in a function (because it must be initialized before the function is called)
 * 2. Referencing a scope-hoisted function (because JS allows functions to be accessed as long as they exist in scope)
 * 
 * The former is impossible to do cross-module, but the second one can via this mechanism here.
 * 
 * This function is responsible for dependency injection of all syntax types that
 * are dependent on the four recursive syntax types: declarations, types, expressions, and statements.
 * Any syntax type that is dependent on one of these needs to use a registration function
 * that declares its dependencies. Likewise, any type that is dependent on a type that
 * is dependent on a recursive type must also use a registration function like this.
 * Types that are not directly or indirectly dependent on a recursive type can declare
 * their parse functions in the module scope without issue.
 * 
 * This function will import all the registration functions and manually
 * inject the right dependencies. The four parse functions for the recursive
 * types are defined within this function *after* they are injected, which works
 * because of scope hoisting.
 * 
 * Because all syntax types flow through here, this function is the source of truth
 * for all syntax types and their parse functions. The return value is a massive
 * object mapping all of the syntax types to a corresponding parse function.
 * The compiler will use this environment to get the ModuleRoot function, which
 * is required to parse a program.
 */
pub fn SyntaxEnvironment() {
    // types
    let parseFunctionType = parsing::registerFunctionType(parseType);
    let parseParenthesizedType = parsing::registerParenthesizedType(parseType);
    let parseStructType = parsing::registerStructType(parseType);
    let parseTupleType = parsing::registerTupleType(parseType);
    let parseUnionTypeSuffix = parsing::registerUnionType(parseType);
    let (parseSpecificTypeSuffix, parseTypeArgList) = parsing::registerSpecificType(parseType);

    // expressions
    let parseStructLiteral = parsing::registerStructLiteral(parseExpression);
    let parseParenthesizedExpression = parsing::registerParenthesizedExpression(parseExpression);
    let parseTupleLiteral = parsing::registerTupleLiteral(parseExpression);
    let parseArrayLiteral = parsing::registerArrayLiteral(parseExpression);
    let parseVarDeclaration = parsing::registerVarDeclaration(parseExpression);
    let (parsePrefixExpression, parsePostfixExpressionSuffix) = parsing::registerUnaryExpression(parseExpression);
    let parseIfElseExpression = parsing::registerIfElseExpression(parseExpression);
    let parseFunctionApplicationSuffix = parsing::registerFunctionApplication(parseExpression, parseTypeArgList);
    let parseBinaryExpressionSuffix = parsing::registerBinaryExpression(parseExpression);
    let parseArrayAccessSuffix = parsing::registerArrayAccess(parseExpression);

    // statements
    let parseBlock = parsing::registerBlock(parseStatement);
    let parseExpressionStatement = parsing::registerExpressionStatement(parseExpression);
    let parseForStatement = parsing::registerForStatement(parseExpression, parseStatement);
    let parseWhileStatement = parsing::registerWhileStatement(parseExpression, parseStatement);
    let parseDoWhileStatement = parsing::registerDoWhileStatement(parseExpression, parseStatement);
    let parseReturnStatement = parsing::registerReturnStatement(parseExpression);
    let parseThrowStatement = parsing::registerThrowStatement(parseExpression);

    // declarations
    let (parseTypeDeclaration, parseAnonymousTypeDeclaration, parseTypeParamList) = parsing::registerTypeDeclaration(parseType);
    let (parseFunctionDeclaration, parseAnonymousFunctionDeclaration, parseParam, parseFunctionBody) = parsing::registerFunctionDeclaration(parseType, parseExpression, parseStatement, parseBlock, parseTypeParamList);
    let (parseConstantDeclaration, parseAnonymousConstantDeclaration) = parsing::registerConstantDeclaration(parseExpression);

    // requires Param/FunctionBody from FunctionDeclaration
    let (parseLambdaExpression, parseShorthandLambdaExpression) = parsing::registerLambdaExpression(parseParam, parseFunctionBody);
    let parseTryCatchStatement = parsing::registerTryCatchStatement(parseStatement, parseParam);

    // module
    let parseExportDeclaration = parsing::registerExportDeclaration(parseDeclaration, parseAnonymousDeclaration);
    let (parseNamespaceDeclaration, parseAnonymousNamespaceDeclaration) = parsing::registerNamespaceDeclaration(parseDeclaration, parseExportDeclaration);
    let parseModuleRoot = parsing::registerModuleRoot(parseDeclaration, parseExportDeclaration);

    let parseDeclaration = |parser: Parser| -> ParseResult<Declaration> {
        let fun: ParseFunc<Declaration> = select::<Declaration>(
            parseTypeDeclaration,
            parseFunctionDeclaration,
            parseConstantDeclaration,
            parseNamespaceDeclaration
        );
        return fun(parser);
    };

    let parseAnonymousDeclaration = |parser: Parser| -> ParseResult<AnonymousDeclaration> {
        let fun: ParseFunc<AnonymousDeclaration> = select::<AnonymousDeclaration>(
            parseAnonymousTypeDeclaration,
            parseAnonymousFunctionDeclaration,
            parseAnonymousConstantDeclaration,
            parseAnonymousNamespaceDeclaration
        );
        return fun(parser);
    };

    let parseType = |parser: Parser| -> ParseResult<Type> {
        let fun: ParseFunc<Type> = seq(
            select::<Type>(
                parsing.parseBuiltInType, // must be before IdentifierType
                parseFunctionType, // must be before IdentifierType, ParenthesizedType, TupleType
                parseParenthesizedType, // must be before TupleType
                parseStructType,
                parseTupleType,
                parsing.parseIdentifierType
            ),
            repeat(select::<Type_LeftRecursive>(
                parsing.parseArrayTypeSuffix,
                parseUnionTypeSuffix,
                parseSpecificTypeSuffix,
                parsing.parseNamespaceAccessTypeSuffix
            ), '*'),
            |(base, suffixes)| { suffixes.reduce::<Type>(|base, suffix| { suffix.setBase(base) }, base) }
        );
        return fun(parser);
    };

    let parseExpression = |parser: Parser| -> ParseResult<Expression> {
        let fun: ParseFunc<Expression> = seq(
            select::<Expression>(
                parsing.parseIntegerLiteral,
                parsing.parseFloatLiteral,
                parsing.parseCharLiteral,
                parsing.parseBoolLiteral, // must be before IdentifierExpression
                parsing.parseStringLiteral,
                parseStructLiteral,
                parseLambdaExpression, // must be before TupleLiteral, ParenthesizedExpression
                parseParenthesizedExpression, // must be before TupleLiteral
                parseTupleLiteral,
                parseArrayLiteral,
                parseVarDeclaration, // must be before ShorthandLambdaExpression, IdentifierExpression
                parseShorthandLambdaExpression, // must be before IdentifierExpression
                parsing.parseIdentifierExpression,
                parsePrefixExpression,
                parseIfElseExpression
            ),
            repeat(select::<Expression_LeftRecursive>(
                parseFunctionApplicationSuffix, // must be before BinaryExpression, PostfixExpression
                parseBinaryExpressionSuffix, // must be before PostfixExpression
                parsePostfixExpressionSuffix,
                parseArrayAccessSuffix,
                parsing.parseFieldAccessSuffix
            ), '*'),
            |(base, suffixes)| { suffixes.reduce::<Expression>(|base, suffix| { suffix.setBase(base) }, base) }
        );
        return fun(parser);
    };

    let parseStatement = |parser: Parser| -> ParseResult<Statement> {
        let fun: ParseFunc<Statement> = select::<Statement>(
            parseBlock, // must be before ExpressionStatement
            parseExpressionStatement,
            parseForStatement,
            parseWhileStatement,
            parseDoWhileStatement,
            parseTryCatchStatement,
            parseReturnStatement,
            parseThrowStatement,
            parsing.parseBreakStatement,
            parsing.parseContinueStatement
        );
        return fun(parser);
    };

    return parseModuleRoot;
}

/**
 * The base type of all syntax nodes.
 * All nodes have:
 * - a location (range of text in a file)
 */
pub trait NodeBase {
    fn location() -> FileRange;
    fn syntax_type() -> SyntaxType;
}

/** 
 * The discriminated union of all declaration nodes
 */
pub enum Declaration {
    TypeDeclaration(syntax::TypeDeclaration),
    FunctionDeclaration(syntax::FunctionDeclaration),
    ConstantDeclaration(syntax::ConstantDeclaration),
    NamespaceDeclaration(syntax::NamespaceDeclaration),
}

/** 
 * The discriminated union of all anonymous declaration nodes
 */
pub enum AnonymousDeclaration {
    AnonymousTypedeclaration(syntax::AnonymousTypeDeclaration),
    AnonymousFunctionDeclaration(syntax::AnonymousFunctionDeclaration),
    AnonymousConstantDeclaration(syntax::AnonymousConstantDeclaration),
    AnonymousNamespaceDeclaration(syntax::AnonymousNamespaceDeclaration),
}

/**
 * The discriminated union of all type nodes
 */
pub enum Type {
    BuiltInType(syntax::BuiltInType),
    StructType(syntax::StructType),
    TupleType(syntax::TupleType),
    ArrayType(syntax::ArrayType),
    FunctionType(syntax::FunctionType),
    UnionType(syntax::UnionType),
    IdentifierType(syntax::IdentifierType),
    ParenthesizedType(syntax::ParenthesizedType),
    SpecificType(syntax::SpecificType),
    NamespaceAccessType(syntax::NamespaceAccessType),
}

enum Type_LeftRecursive {
    ArrayTypeSuffix(parsing::ArrayTypeSuffix),
    UnionTypeSuffix(parsing::UnionTypeSuffix),
    NamespaceAccessTypeSuffix(parsing::NamespaceAccessTypeSuffix),
    SpecificTypeSuffix(parsing::SpecificTypeSuffix),
}

/**
 * The discriminated union of all expression nodes
 */
pub enum Expression {
    IntegerLiteral(syntax::IntegerLiteral),
    FloatLiteral(syntax::FloatLiteral),
    CharLiteral(syntax::CharLiteral),
    BoolLiteral(syntax::BoolLiteral),
    StringLiteral(syntax::StringLiteral),
    StructLiteral(syntax::StructLiteral),
    TupleLiteral(syntax::TupleLiteral),
    ArrayLiteral(syntax::ArrayLiteral),
    IdentifierExpression(syntax::IdentifierExpression),
    ParenthesizedExpression(syntax::ParenthesizedExpression),
    VarDeclaration(syntax::VarDeclaration),
    UnaryExpression(syntax::UnaryExpression),
    BinaryExpression(syntax::BinaryExpression),
    FunctionApplication(syntax::FunctionApplication),
    ArrayAccess(syntax::ArrayAccess),
    FieldAccess(syntax::FieldAccess),
    IfElseExpression(syntax::IfElseExpression),
    LambdaExpression(syntax::LambdaExpression),
}

enum Expression_LeftRecursive {
    FunctionApplicationSuffix(parsing::FunctionApplicationSuffix),
    BinaryExpressionSuffix(parsing::BinaryExpressionSuffix),
    PostfixExpressionSuffix(parsing::PostfixExpressionSuffix),
    ArrayAccessSuffix(parsing::ArrayAccessSuffix),
    FieldAccessSuffix(parsing::FieldAccessSuffix),
}

/**
 * The discriminated union of all statement nodes
 */
pub enum Statement {
    Block(syntax::Block),
    ExpressionStatement(syntax::ExpressionStatement),
    ForStatement(syntax::ForStatement),
    WhileStatement(syntax::WhileStatement),
    DoWhileStatement(syntax::DoWhileStatement),
    TryCatchStatement(syntax::TryCatchStatement),
    ReturnStatement(syntax::ReturnStatement),
    ThrowStatement(syntax::ThrowStatement),
    BreakStatement(syntax::BreakStatement),
    ContinueStatement(syntax::ContinueStatement),
}

/**
 * The discriminated union of all syntax nodes
 */
pub enum Node {
    // module root is a special node type
    ModuleRoot(syntax::ModuleRoot),
    // types related to the module system
    ImportDeclaration(syntax::ImportDeclaration),
    ExportDeclaration(syntax::ExportDeclaration),
    ExportForwardDeclaration(syntax::ExportForwardDeclaration),
    AnonymousDeclaration(AnonymousDeclaration),
    // types that do not fit into any of the general categories
    TypeParam(syntax::TypeParam),
    Param(syntax::Param),
    // the general categories
    Declaration(Declaration),
    Type(Type),
    Expression(Expression),
    Statement(Statement),
}
