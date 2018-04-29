import { FileRange } from '~/core';
import { ParseFunc, Parser, ParseResult, select, seq, repeat } from '~/parser/parser';
import {
    // module
    ModuleRoot, ImportDeclaration, ExportDeclaration, ExportForwardDeclaration,
    // declaration
    TypeDeclaration, FunctionDeclaration, ConstantDeclaration, NamespaceDeclaration,
    // type
    BuiltInType, StructType, TupleType, ArrayType, FunctionType, UnionType, IdentifierType, ParenthesizedType,
    SpecificType, NamespaceAccessType,
    // expression
    IntegerLiteral, FloatLiteral, CharLiteral, BoolLiteral, StringLiteral, StructLiteral,
    LambdaExpression, ParenthesizedExpression, TupleLiteral, IdentifierExpression, UnaryExpression, IfElseExpression,
    FunctionApplication, BinaryExpression, ArrayAccess, FieldAccess, ArrayLiteral, VarDeclaration,
    // statement
    Block, ExpressionStatement, ForStatement, WhileStatement, DoWhileStatement, TryCatchStatement, ReturnStatement,
    ThrowStatement, BreakStatement, ContinueStatement,
    // other
    Param, TypeParam
} from '.';

// all of the imports below are "internal" and required only for parsing
import { register as register_FunctionType } from './types/FunctionType';
import { register as register_ParenthesizedType } from './types/ParenthesizedType';
import { register as register_StructType } from './types/StructType';
import { register as register_TupleType } from './types/TupleType';
import { ArrayTypeSuffix } from './types/ArrayType';
import { UnionTypeSuffix, register as register_UnionType } from './types/UnionType';
import { NamespaceAccessTypeSuffix } from './types/NamespaceAccessType';
import { SpecificTypeSuffix, register as register_SpecificTypeSuffix } from './types/SpecificType';
import { register as register_StructLiteral } from './expressions/StructLiteral';
import { register as register_LambdaExpression } from './expressions/LambdaExpression';
import { register as register_ParenthesizedExpression } from './expressions/ParenthesizedExpression';
import { register as register_TupleLiteral } from './expressions/TupleLiteral';
import { register as register_ArrayLiteral } from './expressions/ArrayLiteral';
import { register as register_VarDeclaration } from './expressions/VarDeclaration';
import { PostfixExpressionSuffix, register as register_UnaryExpression } from './expressions/UnaryExpression';
import { register as register_IfElseExpression } from './expressions/IfElseExpression';
import { FunctionApplicationSuffix, register as register_FunctionApplication } from './expressions/FunctionApplication';
import { BinaryExpressionSuffix, register as register_BinaryExpression } from './expressions/BinaryExpression';
import { ArrayAccessSuffix, register as register_ArrayAccess } from './expressions/ArrayAccess';
import { FieldAccessSuffix } from './expressions/FieldAccess';
import { register as register_Block } from './statements/Block';
import { register as register_ExpressionStatement } from './statements/ExpressionStatement';
import { register as register_ForStatement } from './statements/ForStatement';
import { register as register_WhileStatement } from './statements/WhileStatement';
import { register as register_DoWhileStatement } from './statements/DoWhileStatement';
import { register as register_TryCatchStatement } from './statements/TryCatchStatement';
import { register as register_ReturnStatement } from './statements/ReturnStatement';
import { register as register_ThrowStatement } from './statements/ThrowStatement';
import { register as register_ExportDeclaration } from './declarations/ExportDeclaration';
import { register as register_TypeDeclaration } from './declarations/TypeDeclaration';
import { register as register_FunctionDeclaration } from './declarations/FunctionDeclaration';
import { register as register_ConstantDeclaration } from './declarations/ConstantDeclaration';
import { register as register_NamespaceDeclaration } from './declarations/NamespaceDeclaration';
import { register as register_ModuleRoot } from './ModuleRoot';

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
    FunctionDeclaration = 'FunctionDeclaration',
    ConstantDeclaration = 'ConstantDeclaration',
    NamespaceDeclaration = 'NamespaceDeclaration',
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
    const { FunctionType } = register_FunctionType(TypeNode);
    const { ParenthesizedType } = register_ParenthesizedType(TypeNode);
    const { StructType } = register_StructType(TypeNode);
    const { TupleType } = register_TupleType(TypeNode);
    const { UnionTypeSuffix } = register_UnionType(TypeNode);
    const { SpecificTypeSuffix, TypeArgList } = register_SpecificTypeSuffix(TypeNode);

    // expressions
    const { StructLiteral } = register_StructLiteral(Expression);
    const { ParenthesizedExpression } = register_ParenthesizedExpression(Expression);
    const { TupleLiteral } = register_TupleLiteral(Expression);
    const { ArrayLiteral } = register_ArrayLiteral(Expression);
    const { VarDeclaration } = register_VarDeclaration(Expression);
    const { PrefixExpression, PostfixExpressionSuffix } = register_UnaryExpression(Expression);
    const { IfElseExpression } = register_IfElseExpression(Expression);
    const { FunctionApplicationSuffix } = register_FunctionApplication(Expression, TypeArgList);
    const { BinaryExpressionSuffix } = register_BinaryExpression(Expression);
    const { ArrayAccessSuffix } = register_ArrayAccess(Expression);

    // statements
    const { Block } = register_Block(Statement);
    const { ExpressionStatement } = register_ExpressionStatement(Expression);
    const { ForStatement } = register_ForStatement(Expression, Statement);
    const { WhileStatement } = register_WhileStatement(Expression, Statement);
    const { DoWhileStatement } = register_DoWhileStatement(Expression, Statement);
    const { ReturnStatement } = register_ReturnStatement(Expression);
    const { ThrowStatement } = register_ThrowStatement(Expression);

    // declarations
    const { TypeDeclaration, TypeParamList } = register_TypeDeclaration(TypeNode);
    const { FunctionDeclaration, Param, FunctionBody } = register_FunctionDeclaration(TypeNode, Expression, Statement, Block, TypeParamList);
    const { ConstantDeclaration } = register_ConstantDeclaration(Expression);

    // requires Param/FunctionBody from FunctionDeclaration
    const { LambdaExpression, ShorthandLambdaExpression } = register_LambdaExpression(Param, FunctionBody);
    const { TryCatchStatement } = register_TryCatchStatement(Statement, Param);

    // module
    const { ExportDeclaration } = register_ExportDeclaration(Declaration);
    const { NamespaceDeclaration } = register_NamespaceDeclaration(Declaration, ExportDeclaration);
    const { ModuleRoot } = register_ModuleRoot(Declaration, ExportDeclaration);

    function Declaration(parser: Parser): ParseResult<Declaration> {
        const fn: ParseFunc<Declaration> = select<Declaration>(
            TypeDeclaration,
            FunctionDeclaration,
            ConstantDeclaration,
            NamespaceDeclaration
        );
        return fn(parser);
    }

    function TypeNode(parser: Parser): ParseResult<TypeNode> {
        const fn: ParseFunc<TypeNode> = seq(
            select<TypeNode>(
                BuiltInType, // must be before IdentifierType
                FunctionType, // must be before IdentifierType, ParenthesizedType, TupleType
                ParenthesizedType, // must be before TupleType
                StructType,
                TupleType,
                IdentifierType
            ),
            repeat(select<TypeNode_LeftRecursive>(
                ArrayTypeSuffix,
                UnionTypeSuffix,
                SpecificTypeSuffix,
                NamespaceAccessTypeSuffix
            ), '*'),
            ([base, suffixes]) => suffixes.reduce<TypeNode>((base, suffix) => suffix.setBase(base), base)
        );
        return fn(parser);
    }

    function Expression(parser: Parser): ParseResult<Expression> {
        const fn: ParseFunc<Expression> = seq(
            select<Expression>(
                IntegerLiteral,
                FloatLiteral,
                CharLiteral,
                BoolLiteral, // must be before IdentifierExpression
                StringLiteral,
                StructLiteral,
                LambdaExpression, // must be before TupleLiteral, ParenthesizedExpression
                ParenthesizedExpression, // must be before TupleLiteral
                TupleLiteral,
                ArrayLiteral,
                VarDeclaration, // must be before ShorthandLambdaExpression, IdentifierExpression
                ShorthandLambdaExpression, // must be before IdentifierExpression
                IdentifierExpression,
                PrefixExpression,
                IfElseExpression
            ),
            repeat(select<Expression_LeftRecursive>(
                FunctionApplicationSuffix, // must be before BinaryExpression, PostfixExpression
                BinaryExpressionSuffix, // must be before PostfixExpression
                PostfixExpressionSuffix,
                ArrayAccessSuffix,
                FieldAccessSuffix
            ), '*'),
            ([base, suffixes]) => suffixes.reduce<Expression>((base, suffix) => suffix.setBase(base), base)
        );
        return fn(parser);
    }

    function Statement(parser: Parser): ParseResult<Statement> {
        const fn: ParseFunc<Statement> = select<Statement>(
            Block, // must be before ExpressionStatement
            ExpressionStatement,
            ForStatement,
            WhileStatement,
            DoWhileStatement,
            TryCatchStatement,
            ReturnStatement,
            ThrowStatement,
            BreakStatement,
            ContinueStatement
        );
        return fn(parser);
    }

    return {
        ModuleRoot
    };
}

/**
 * The base type of all syntax nodes.
 * All nodes have:
 * - a location (range of text in a file)
 * - a syntax type (the discriminant for the various node union types)
 */
export interface NodeBase<K extends SyntaxType> {
    readonly location: FileRange;
    readonly syntaxType: K;
}

/** 
 * The discriminated union of all declaration nodes
 */
export type Declaration =
    | TypeDeclaration
    | FunctionDeclaration
    | ConstantDeclaration
    | NamespaceDeclaration;

/**
 * The discriminated union of all type nodes
 */
export type TypeNode =
    | BuiltInType
    | StructType
    | TupleType
    | ArrayType
    | FunctionType
    | UnionType
    | IdentifierType
    | ParenthesizedType
    | SpecificType
    | NamespaceAccessType;

type TypeNode_LeftRecursive =
    | ArrayTypeSuffix
    | UnionTypeSuffix
    | NamespaceAccessTypeSuffix
    | SpecificTypeSuffix;

/**
 * The discriminated union of all expression nodes
 */
export type Expression =
    | IntegerLiteral
    | FloatLiteral
    | CharLiteral
    | BoolLiteral
    | StringLiteral
    | StructLiteral
    | TupleLiteral
    | ArrayLiteral
    | IdentifierExpression
    | ParenthesizedExpression
    | VarDeclaration
    | UnaryExpression
    | BinaryExpression
    | FunctionApplication
    | ArrayAccess
    | FieldAccess
    | IfElseExpression
    | LambdaExpression;

type Expression_LeftRecursive =
    | FunctionApplicationSuffix
    | BinaryExpressionSuffix
    | PostfixExpressionSuffix
    | ArrayAccessSuffix
    | FieldAccessSuffix;

/**
 * The discriminated union of all statement nodes
 */
export type Statement =
    | Block
    | ExpressionStatement
    | ForStatement
    | WhileStatement
    | DoWhileStatement
    | TryCatchStatement
    | ReturnStatement
    | ThrowStatement
    | BreakStatement
    | ContinueStatement;

/**
 * The discriminated union of all syntax nodes
 */
export type Node =
    // module root is a special node type
    | ModuleRoot
    // types related to the module system
    | ImportDeclaration
    | ExportDeclaration
    | ExportForwardDeclaration
    // types that do not fit into any of the general categories
    | TypeParam
    | Param
    // the general categories
    | Declaration
    | TypeNode
    | Expression
    | Statement;
