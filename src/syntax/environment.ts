import { FileRange, CoreObject } from '~/core';
import { ParseFunc, Parser, ParseResult, select, seq, repeat } from '~/parser/parser';
import * as syntax from '.';
import * as parsing from './parsing';

/**
 * The full enumeration of types of syntax nodes in the language.
 */
export enum SyntaxType {
    // #region module
    ModuleRoot = 'ModuleRoot',
    ImportDeclaration = 'ImportDeclaration',
    ExportDeclaration = 'ExportDeclaration',
    ExportForwardDeclaration = 'ExportForwardDeclaration',
    // #endregion
    // #region declarations
    TypeDeclaration = 'TypeDeclaration',
    AnonymousTypeDeclaration = 'AnonymousTypeDeclaration',
    FunctionDeclaration = 'FunctionDeclaration',
    AnonymousFunctionDeclaration = 'AnonymousFunctionDeclaration',
    ConstantDeclaration = 'ConstantDeclaration',
    AnonymousConstantDeclaration = 'AnonymousConstantDeclaration',
    NamespaceDeclaration = 'NamespaceDeclaration',
    AnonymousNamespaceDeclaration = 'AnonymousNamespaceDeclaration',
    // #endregion
    // #region types
    BuiltInType = 'BuiltInType',
    StructType = 'StructType',
    TupleType = 'TupleType',
    ArrayType = 'ArrayType',
    FunctionType = 'FunctionType',
    UnionType = 'UnionType',
    IdentifierType = 'IdentifierType',
    ParenthesizedType = 'ParenthesizedType',
    SpecificType = 'SpecificType',
    NamespaceAccessType = 'NamespaceAccessType',
    // #endregion
    // #region expressions
    IntegerLiteral = 'IntegerLiteral',
    FloatLiteral = 'FloatLiteral',
    CharLiteral = 'CharLiteral',
    BoolLiteral = 'BoolLiteral',
    StringLiteral = 'StringLiteral',
    StructLiteral = 'StructLiteral',
    TupleLiteral = 'TupleLiteral',
    ArrayLiteral = 'ArrayLiteral',
    IdentifierExpression = 'IdentifierExpression',
    ParenthesizedExpression = 'ParenthesizedExpression',
    VarDeclaration = 'VarDeclaration',
    UnaryExpression = 'UnaryExpression',
    BinaryExpression = 'BinaryExpression',
    FunctionApplication = 'FunctionApplication',
    ArrayAccess = 'ArrayAccess',
    FieldAccess = 'FieldAccess',
    IfElseExpression = 'IfElseExpression',
    LambdaExpression = 'LambdaExpression',
    // #endregion
    // #region statements
    Block = 'Block',
    ExpressionStatement = 'ExpressionStatement',
    ForStatement = 'ForStatement',
    WhileStatement = 'WhileStatement',
    DoWhileStatement = 'DoWhileStatement',
    TryCatchStatement = 'TryCatchStatement',
    ReturnStatement = 'ReturnStatement',
    ThrowStatement = 'ThrowStatement',
    BreakStatement = 'BreakStatement',
    ContinueStatement = 'ContinueStatement',
    // #endregion
    // #region other
    TypeParam = 'TypeParam',
    Param = 'Param',
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
export function SyntaxEnvironment() {
    // types
    const { parseFunctionType } = parsing.registerFunctionType(parseType);
    const { parseParenthesizedType } = parsing.registerParenthesizedType(parseType);
    const { parseStructType } = parsing.registerStructType(parseType);
    const { parseTupleType } = parsing.registerTupleType(parseType);
    const { parseUnionTypeSuffix } = parsing.registerUnionType(parseType);
    const { parseSpecificTypeSuffix, parseTypeArgList } = parsing.registerSpecificType(parseType);

    // expressions
    const { parseStructLiteral } = parsing.registerStructLiteral(parseExpression);
    const { parseParenthesizedExpression } = parsing.registerParenthesizedExpression(parseExpression);
    const { parseTupleLiteral } = parsing.registerTupleLiteral(parseExpression);
    const { parseArrayLiteral } = parsing.registerArrayLiteral(parseExpression);
    const { parseVarDeclaration } = parsing.registerVarDeclaration(parseExpression);
    const { parsePrefixExpression, parsePostfixExpressionSuffix } = parsing.registerUnaryExpression(parseExpression);
    const { parseIfElseExpression } = parsing.registerIfElseExpression(parseExpression);
    const { parseFunctionApplicationSuffix } = parsing.registerFunctionApplication(parseExpression, parseTypeArgList);
    const { parseBinaryExpressionSuffix } = parsing.registerBinaryExpression(parseExpression);
    const { parseArrayAccessSuffix } = parsing.registerArrayAccess(parseExpression);

    // statements
    const { parseBlock } = parsing.registerBlock(parseStatement);
    const { parseExpressionStatement } = parsing.registerExpressionStatement(parseExpression);
    const { parseForStatement } = parsing.registerForStatement(parseExpression, parseStatement);
    const { parseWhileStatement } = parsing.registerWhileStatement(parseExpression, parseStatement);
    const { parseDoWhileStatement } = parsing.registerDoWhileStatement(parseExpression, parseStatement);
    const { parseReturnStatement } = parsing.registerReturnStatement(parseExpression);
    const { parseThrowStatement } = parsing.registerThrowStatement(parseExpression);

    // declarations
    const { parseTypeDeclaration, parseAnonymousTypeDeclaration, parseTypeParamList } = parsing.registerTypeDeclaration(parseType);
    const { parseFunctionDeclaration, parseAnonymousFunctionDeclaration, parseParam, parseFunctionBody } = parsing.registerFunctionDeclaration(parseType, parseExpression, parseStatement, parseBlock, parseTypeParamList);
    const { parseConstantDeclaration, parseAnonymousConstantDeclaration } = parsing.registerConstantDeclaration(parseExpression);

    // requires Param/FunctionBody from FunctionDeclaration
    const { parseLambdaExpression, parseShorthandLambdaExpression } = parsing.registerLambdaExpression(parseParam, parseFunctionBody);
    const { parseTryCatchStatement } = parsing.registerTryCatchStatement(parseStatement, parseParam);

    // module
    const { parseExportDeclaration } = parsing.registerExportDeclaration(parseDeclaration, parseAnonymousDeclaration);
    const { parseNamespaceDeclaration, parseAnonymousNamespaceDeclaration } = parsing.registerNamespaceDeclaration(parseDeclaration, parseExportDeclaration);
    const { parseModuleRoot } = parsing.registerModuleRoot(parseDeclaration, parseExportDeclaration);

    function parseDeclaration(parser: Parser): ParseResult<Declaration> {
        const fn: ParseFunc<Declaration> = select<Declaration>(
            parseTypeDeclaration,
            parseFunctionDeclaration,
            parseConstantDeclaration,
            parseNamespaceDeclaration
        );
        return fn(parser);
    }

    function parseAnonymousDeclaration(parser: Parser): ParseResult<AnonymousDeclaration> {
        const fn: ParseFunc<AnonymousDeclaration> = select<AnonymousDeclaration>(
            parseAnonymousTypeDeclaration,
            parseAnonymousFunctionDeclaration,
            parseAnonymousConstantDeclaration,
            parseAnonymousNamespaceDeclaration
        );
        return fn(parser);
    }

    function parseType(parser: Parser): ParseResult<Type> {
        const fn: ParseFunc<Type> = seq(
            select<Type>(
                parsing.parseBuiltInType, // must be before IdentifierType
                parseFunctionType, // must be before IdentifierType, ParenthesizedType, TupleType
                parseParenthesizedType, // must be before TupleType
                parseStructType,
                parseTupleType,
                parsing.parseIdentifierType
            ),
            repeat(select<Type_LeftRecursive>(
                parsing.parseArrayTypeSuffix,
                parseUnionTypeSuffix,
                parseSpecificTypeSuffix,
                parsing.parseNamespaceAccessTypeSuffix
            ), '*'),
            ([base, suffixes]) => suffixes.reduce<Type>((base, suffix) => suffix.setBase(base), base)
        );
        return fn(parser);
    }

    function parseExpression(parser: Parser): ParseResult<Expression> {
        const fn: ParseFunc<Expression> = seq(
            select<Expression>(
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
            repeat(select<Expression_LeftRecursive>(
                parseFunctionApplicationSuffix, // must be before BinaryExpression, PostfixExpression
                parseBinaryExpressionSuffix, // must be before PostfixExpression
                parsePostfixExpressionSuffix,
                parseArrayAccessSuffix,
                parsing.parseFieldAccessSuffix
            ), '*'),
            ([base, suffixes]) => suffixes.reduce<Expression>((base, suffix) => suffix.setBase(base), base)
        );
        return fn(parser);
    }

    function parseStatement(parser: Parser): ParseResult<Statement> {
        const fn: ParseFunc<Statement> = select<Statement>(
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
        return fn(parser);
    }

    return {
        parseModuleRoot
    };
}

/**
 * The base type of all syntax nodes.
 * All nodes have:
 * - a location (range of text in a file)
 */
export abstract class NodeBase<K extends SyntaxType> extends CoreObject {
    constructor(
        readonly location: FileRange,
        readonly syntaxType: K
    ) { super() }
}

/** 
 * The discriminated union of all declaration nodes
 */
export type Declaration =
    | syntax.TypeDeclaration
    | syntax.FunctionDeclaration
    | syntax.ConstantDeclaration
    | syntax.NamespaceDeclaration;

export function isDeclaration(node: NodeBase<SyntaxType>): node is Declaration {
    return [
        SyntaxType.TypeDeclaration,
        SyntaxType.ConstantDeclaration,
        SyntaxType.FunctionDeclaration,
        SyntaxType.NamespaceDeclaration
    ].includes(node.syntaxType);
}

/** 
 * The discriminated union of all anonymous declaration nodes
 */
export type AnonymousDeclaration =
    | syntax.AnonymousTypeDeclaration
    | syntax.AnonymousFunctionDeclaration
    | syntax.AnonymousConstantDeclaration
    | syntax.AnonymousNamespaceDeclaration;

/**
 * The discriminated union of all type nodes
 */
export type Type =
    | syntax.BuiltInType
    | syntax.StructType
    | syntax.TupleType
    | syntax.ArrayType
    | syntax.FunctionType
    | syntax.UnionType
    | syntax.IdentifierType
    | syntax.ParenthesizedType
    | syntax.SpecificType
    | syntax.NamespaceAccessType;

type Type_LeftRecursive =
    | parsing.ArrayTypeSuffix
    | parsing.UnionTypeSuffix
    | parsing.NamespaceAccessTypeSuffix
    | parsing.SpecificTypeSuffix;

/**
 * The discriminated union of all expression nodes
 */
export type Expression =
    | syntax.IntegerLiteral
    | syntax.FloatLiteral
    | syntax.CharLiteral
    | syntax.BoolLiteral
    | syntax.StringLiteral
    | syntax.StructLiteral
    | syntax.TupleLiteral
    | syntax.ArrayLiteral
    | syntax.IdentifierExpression
    | syntax.ParenthesizedExpression
    | syntax.VarDeclaration
    | syntax.UnaryExpression
    | syntax.BinaryExpression
    | syntax.FunctionApplication
    | syntax.ArrayAccess
    | syntax.FieldAccess
    | syntax.IfElseExpression
    | syntax.LambdaExpression;

type Expression_LeftRecursive =
    | parsing.FunctionApplicationSuffix
    | parsing.BinaryExpressionSuffix
    | parsing.PostfixExpressionSuffix
    | parsing.ArrayAccessSuffix
    | parsing.FieldAccessSuffix;

/**
 * The discriminated union of all statement nodes
 */
export type Statement =
    | syntax.Block
    | syntax.ExpressionStatement
    | syntax.ForStatement
    | syntax.WhileStatement
    | syntax.DoWhileStatement
    | syntax.TryCatchStatement
    | syntax.ReturnStatement
    | syntax.ThrowStatement
    | syntax.BreakStatement
    | syntax.ContinueStatement;

/**
 * The discriminated union of all syntax nodes
 */
export type Node =
    // module root is a special node type
    | syntax.ModuleRoot
    // types related to the module system
    | syntax.ImportDeclaration
    | syntax.ExportDeclaration
    | syntax.ExportForwardDeclaration
    | AnonymousDeclaration
    // types that do not fit into any of the general categories
    | syntax.TypeParam
    | syntax.Param
    // the general categories
    | Declaration
    | Type
    | Expression
    | Statement;
