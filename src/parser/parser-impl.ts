import * as decls from '../syntax/declarations/cst';
import * as types from '../syntax/types/cst';
import * as exprs from '../syntax/expressions/cst';
import * as stmts from '../syntax/statements/cst';
import * as mess from './ParserMessages';
import Parser from './Parser';

/**
 * This file contains the IMPLEMENTATION of the Ren parser,
 * using the framework provided by ./Parser.js.
 * To run a parse, import the Parser class from ./Parser.js,
 * instantiate it with the source string, and call acceptProgram()
 * below with the parser. The output will be the resulting AST
 * or a thrown ParserError.
 */

// ///////////////
// DECLARATIONS //
// ///////////////

/**
 * Program ::= ImportDeclaration* Declaration* EOF
 */
export function acceptProgram(parser: Parser) {
    return parser.accept([
        { name: 'imports', parse: acceptImportDeclaration, zeroOrMore: true, definite: true },
        { name: 'declarations', parse: acceptDeclaration, zeroOrMore: true, definite: true },
        { name: 'eof', type: 'EOF', definite: true },
    ], decls.STProgram);
}

/**
 * ImportDeclaration ::= IMPORT FROM STRING_LITERAL COLON ImportList
 */
export function acceptImportDeclaration(parser: Parser) {
    return parser.accept([
        { name: 'importToken', type: 'IMPORT', definite: true },
        { name: 'fromToken', type: 'FROM', mess: mess.INVALID_IMPORT },
        { name: 'moduleNameToken', type: 'STRING_LITERAL', mess: mess.INVALID_IMPORT_MODULE },
        { name: 'colonToken', type: 'COLON', mess: mess.INVALID_IMPORT },
        { name: 'imports', parse: acceptImportList, mess: mess.INVALID_IMPORT },
    ], decls.STImportDeclaration);
}

/**
 * ImportList ::= IDENT | NamedImports
 */
export function acceptImportList(parser: Parser) {
    return parser.acceptOneOf([
        { type: 'IDENT' },
        { parse: acceptNamedImports },
    ], decls.STImportList);
}

/**
 * NamedImports ::= LBRACE ImportComponent(+ sep COMMA) RBRACE
 */
export function acceptNamedImports(parser: Parser) {
    return parser.accept([
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'importComponents', parse: acceptImportComponent, mess: mess.INVALID_IMPORT, oneOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeBraceToken', type: 'RBRACE', mess: mess.INVALID_IMPORT },
    ], decls.STNamedImports);
}

/**
 * ImportComponent ::= IDENT | ImportWithAlias
 */
export function acceptImportComponent(parser: Parser) {
    return parser.acceptOneOf([
        { parse: acceptImportWithAlias },
        { type: 'IDENT' },
    ], decls.STImportComponent);
}

/**
 * ImportWithAlias ::= IDENT AS IDENT
 */
export function acceptImportWithAlias(parser: Parser) {
    return parser.accept([
        { name: 'importNameToken', type: 'IDENT' },
        { name: 'asToken', type: 'AS', definite: true },
        { name: 'importAliasToken', type: 'IDENT', mess: mess.INVALID_IMPORT },
    ], decls.STImportWithAlias);
}

/**
 * Declaration ::= FunctionDeclaration | TypeDeclaration | ExportDeclaration
 */
export function acceptDeclaration(parser: Parser) {
    return parser.acceptOneOf([
        { parse: acceptFunctionDeclaration },
        { parse: acceptTypeDeclaration },
        { parse: acceptExportDeclaration },
    ], decls.STDeclaration);
}

/**
 * FunctionDeclaration ::= FUNC Type IDENT TypeParamList? ParameterList FAT_ARROW FunctionBody
 */
export function acceptFunctionDeclaration(parser: Parser) {
    return parser.accept([
        { name: 'funcToken', type: 'FUNC', definite: true },
        { name: 'returnType', parse: acceptType, mess: mess.INVALID_RETURN_TYPE },
        { name: 'functionNameToken', type: 'IDENT', mess: mess.INVALID_FUNCTION_NAME },
        { name: 'typeParamList', parse: acceptTypeParamList, optional: true },
        { name: 'paramsList', parse: acceptParameterList, mess: mess.INVALID_PARAMETER_LIST },
        { name: 'fatArrowToken', type: 'FAT_ARROW', mess: mess.INVALID_FAT_ARROW },
        { name: 'functionBody', parse: acceptFunctionBody },
    ], decls.STFunctionDeclaration);
}

/**
 * ParameterList ::= LPAREN Param(* sep COMMA) RPAREN
 */
export function acceptParameterList(parser: Parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN', definite: true },
        { name: 'params', parse: acceptParam, zeroOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.MISSING_CLOSE_PAREN },
    ], decls.STParameterList);
}

/**
 * Param ::= Type IDENT
 */
export function acceptParam(parser: Parser) {
    return parser.accept([
        { name: 'typeNode', parse: acceptType, mess: mess.INVALID_PARAMETER_TYPE, definite: true },
        { name: 'nameToken', type: 'IDENT', mess: mess.INVALID_PARAMETER_NAME },
    ], decls.STParam);
}

/**
 * FunctionBody ::= Block | Expression | Statement
 *
 * Function bodies are complicated because there is ambiguity between blocks
 * and struct literals. We make blocks take priority because they are more loose
 * in structure.
 */
export function acceptFunctionBody(parser: Parser) {
    return parser.acceptOneOf([
        { parse: acceptBlock },
        { parse: acceptExpression },
        { parse: acceptStatement },
    ], decls.STFunctionBody);
}

/**
 * TypeDeclaration ::= TYPE IDENT TypeParamList? EQUALS Type
 */
export function acceptTypeDeclaration(parser: Parser) {
    return parser.accept([
        { name: 'typeToken', type: 'TYPE', definite: true },
        { name: 'typeNameToken', type: 'IDENT', mess: mess.INVALID_TYPE_NAME },
        { name: 'typeParamList', parse: acceptTypeParamList, optional: true },
        { name: 'equalsToken', type: 'EQUALS', mess: mess.TYPE_DECL_MISSING_EQUALS },
        { name: 'typeNode', parse: acceptType, mess: mess.INVALID_TYPE },
    ], decls.STTypeDeclaration);
}

/**
 * ExportDeclaration ::= EXPORT ExportName ExportValue
 */
export function acceptExportDeclaration(parser: Parser) {
    return parser.accept([
        { name: 'exportToken', type: 'EXPORT', definite: true },
        { name: 'exportName', parse: acceptExportName },
        { name: 'exportValue', parse: acceptExportValue },
    ], decls.STExportDeclaration);
}

/**
 * ExportName ::= DEFAULT | NamedExport
 */
export function acceptExportName(parser: Parser) {
    return parser.acceptOneOf([
        { type: 'DEFAULT' },
        { parse: acceptNamedExport },
    ], decls.STExportName);
}

/**
 * NamedExport ::= IDENT EQUALS
 */
export function acceptNamedExport(parser: Parser) {
    return parser.accept([
        { name: 'exportNameToken', type: 'IDENT', definite: true },
        { name: 'equalsToken', type: 'EQUALS' },
    ], decls.STNamedExport);
}

/**
 * ExportValue ::= FunctionDeclaration | TypeDeclaration | Expression
 */
export function acceptExportValue(parser: Parser) {
    return parser.acceptOneOf([
        { parse: acceptFunctionDeclaration },
        { parse: acceptTypeDeclaration },
        { parse: acceptExpression },
    ], decls.STExportValue);
}

/**
 * TypeParamList ::= LT TypeParam(+ sep COMMA) GT
 */
export function acceptTypeParamList(parser: Parser) {
    return parser.accept([
        { name: 'openLtToken', image: '<' },
        { name: 'typeParams', parse: acceptTypeParam, mess: mess.INVALID_TYPE_PARAM_LIST, oneOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeGtToken', image: '>', definite: true },
    ], decls.STTypeParamList);
}

/**
 * TypeParam ::= VarianceOp? IDENT TypeConstraint?
 */
export function acceptTypeParam(parser: Parser) {
    return parser.accept([
        { name: 'varianceOp', parse: acceptVarianceOp, optional: true, definite: true },
        { name: 'nameToken', type: 'IDENT', mess: mess.INVALID_TYPE_PARAM, definite: true },
        { name: 'typeConstraint', parse: acceptTypeConstraint, optional: true },
    ], decls.STTypeParam);
}

/**
 * VarianceOp ::= PLUS | MINUS
 */
export function acceptVarianceOp(parser: Parser) {
    return parser.acceptOneOf([
        { image: '+' },
        { image: '-' },
    ], decls.STVarianceOp);
}

/**
 * TypeConstraint ::= ConstraintOp Type
 */
export function acceptTypeConstraint(parser: Parser) {
    return parser.accept([
        { name: 'colonToken', type: 'COLON', definite: true },
        { name: 'constraintType', parse: acceptType, mess: mess.INVALID_TYPE_PARAM },
    ], decls.STTypeConstraint);
}

// ////////
// TYPES //
// ////////

/**
 * Type ::= U8 | I8 | BYTE |       # 8-bit integers:  unsigned, signed, unsigned
 *          U16 | I16 | SHORT |    # 16-bit integers: unsigned, signed, unsigned
 *          U32 | I32 | INTEGER |  # 32-bit integers: unsigned, signed, signed
 *          U64 | I64 | LONG |     # 64-bit integers: unsigned, signed, signed
 *          INT |                  # Unbounded integers
 *          F32 | FLOAT |          # 32-bit floating point numbers
 *          F64 | DOUBLE |         # 64-bit floating point numbers
 *          STRING |               # Array of characters
 *          CHAR |                 # UTF-8 Character
 *          BOOL |                 # Boolean value
 *          VOID |                 # No type (alias of ())
 *          StructType |           # Structured type
 *          TupleType |            # Tuple type
 *          FunctionType |         # Function type
 *          ParenthesizedType |    # Parenthesized type
 *          SpecificType |         # Specific type ("instantiation" of generic type)
 *          IDENT |                # Already defined type
 *          Type TypeSuffix
 *
 * TypeSuffix ::= ArrayTypeSuffix
 *              | UnionTypeSuffix
 */
export function acceptType(parser: Parser): types.STType {
    return parser.acceptLeftRecursive({
        bases: [
            { type: 'U8' }, { type: 'I8' }, { type: 'BYTE' },
            { type: 'U16' }, { type: 'I16' }, { type: 'SHORT' },
            { type: 'U32' }, { type: 'I32' }, { type: 'INTEGER' },
            { type: 'U64' }, { type: 'I64' }, { type: 'LONG' },
            { type: 'INT' },
            { type: 'F32' }, { type: 'FLOAT' },
            { type: 'F64' }, { type: 'DOUBLE' },
            { type: 'STRING' },
            { type: 'CHAR' },
            { type: 'BOOL' },
            { type: 'VOID' },
            { type: 'ANY' },
            { parse: acceptStructType },
            { parse: acceptFunctionType },
            { parse: acceptParenthesizedType },
            { parse: acceptTupleType },
            { parse: acceptSpecificType },
            { type: 'IDENT' },
        ],
        suffixes: [
            { baseName: 'baseType', parse: acceptArrayTypeSuffix },
            { baseName: 'left', parse: acceptUnionTypeSuffix },
        ],
    }, types.STTypeNode);
}

/**
 * StructType ::= LBRACE Field* RBRACE
 */
export function acceptStructType(parser: Parser) {
    return parser.accept([
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'fields', parse: acceptField, zeroOrMore: true },
        { name: 'closeBraceToken', type: 'RBRACE', mess: mess.INVALID_STRUCT_NO_CLOSE_BRACE },
    ], types.STStructType);
}

/**
 * Field ::= Type IDENT
 */
export function acceptField(parser: Parser) {
    return parser.accept([
        { name: 'typeNode', parse: acceptType, mess: mess.INVALID_FIELD_TYPE, definite: true },
        { name: 'nameToken', type: 'IDENT', mess: mess.INVALID_FIELD_NAME },
    ], types.STField);
}

/**
 * FunctionType ::= LPAREN Type(* sep COMMA) RPAREN FAT_ARROW Type
 */
export function acceptFunctionType(parser: Parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'paramTypes', parse: acceptType, zeroOrMore: true, mess: mess.INVALID_TYPE, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN' },
        { name: 'fatArrowToken', type: 'FAT_ARROW', definite: true },
        { name: 'returnType', parse: acceptType, mess: mess.FUNCTION_TYPE_INVALID_RETURN_TYPE },
    ], types.STFunctionType);
}

/**
 * ParenthesizedType ::= LPAREN Type RPAREN
 */
export function acceptParenthesizedType(parser: Parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'inner', parse: acceptType, mess: mess.INVALID_TYPE },
        { name: 'closeParenToken', type: 'RPAREN', definite: true },
    ], types.STParenthesizedType);
}

/**
 * TupleType ::= LPAREN Type(* sep COMMA) RPAREN
 */
export function acceptTupleType(parser: Parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'types', parse: acceptType, zeroOrMore: true, mess: mess.INVALID_TYPE, sep: { name: 'commaTokens', type: 'COMMA', definite: true } },
        { name: 'closeParenToken', type: 'RPAREN' },
    ], types.STTupleType);
}

/**
 * SpecificType ::= IDENT TypeArgList
 */
export function acceptSpecificType(parser: Parser) {
    return parser.accept([
        { name: 'nameToken', type: 'IDENT' },
        { name: 'typeArgList', parse: acceptTypeArgList, definite: true },
    ], types.STSpecificType);
}

/**
 * TypeArgList ::= LT Type(* sep COMMA) GT
 */
export function acceptTypeArgList(parser: Parser) {
    return parser.accept([
        { name: 'openLtToken', image: '<', definite: true },
        { name: 'types', parse: acceptType, zeroOrMore: true, mess: mess.INVALID_TYPE_ARG, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeGtToken', image: '>', mess: mess.INVALID_TYPE_ARG_LIST },
    ], types.STTypeArgList);
}

/**
 * ArrayTypeSuffix ::= LBRACK RBRACK
 */
export function acceptArrayTypeSuffix(parser: Parser) {
    return parser.accept([
        { name: 'openBracketToken', type: 'LBRACK', definite: true },
        { name: 'closeBracketToken', type: 'RBRACK' },
    ], types.STArrayType);
}

/**
 * UnionTypeSuffix ::= VBAR Type
 */
export function acceptUnionTypeSuffix(parser: Parser) {
    return parser.accept([
        { name: 'vbarToken', image: '|', definite: true },
        { name: 'right', parse: acceptType, mess: mess.INVALID_UNION_TYPE },
    ], types.STUnionType);
}

// //////////////
// EXPRESSIONS //
// //////////////

/**
 * Expression ::= INTEGER_LITERAL
 *              | FLOAT_LITERAL
 *              | STRING_LITERAL
 *              | CHAR_LITERAL
 *              | TRUE | FALSE
 *              | VarDeclaration            # Starts with IDENT
 *              | ShorthandLambdaExpression # Starts with IDENT
 *              | IDENT                     # Fallback if the above two don't work
 *              | ArrayLiteral
 *              | StructLiteral
 *              | IfElseExpression
 *              | PrefixExpression
 *              | LambdaExpression        # Starts with LPAREN
 *              | TupleLiteral            # Starts with LPAREN, must have !=1 entries
 *              | ParentheticalExpression # Fallback if the above two don't work
 *              | Expression ExpressionSuffix # Left-recursive expansions
 *
 * ExpressionSuffix ::= FunctionApplicationSuffix
 *                    | BinaryExpressionSuffix
 *                    | PostfixExpressionSuffix
 *                    | FieldAccessSuffix
 *                    | ArrayAccessSuffix
 */
export function acceptExpression(parser: Parser): exprs.STExpression {
    return parser.acceptLeftRecursive({
        bases: [
            { type: 'INTEGER_LITERAL' },
            { type: 'FLOAT_LITERAL' },
            { type: 'STRING_LITERAL' },
            { type: 'CHARACTER_LITERAL' },
            { type: 'TRUE' },
            { type: 'FALSE' },
            { parse: acceptVarDeclaration },
            { parse: acceptShorthandLambdaExpression },
            { type: 'IDENT' },
            { parse: acceptArrayLiteral },
            { parse: acceptStructLiteral },
            { parse: acceptIfElseExpression },
            { parse: acceptPrefixExpression },
            { parse: acceptLambdaExpression },
            { parse: acceptParenthesizedExpression },
            { parse: acceptTupleLiteral },
        ],
        suffixes: [
            { baseName: 'target', parse: acceptFunctionApplicationSuffix },
            { baseName: 'left', parse: acceptBinaryExpressionSuffix },
            { baseName: 'target', parse: acceptPostfixExpressionSuffix },
            { baseName: 'target', parse: acceptFieldAccessSuffix },
            { baseName: 'target', parse: acceptArrayAccessSuffix },
        ],
    }, exprs.STExpressionNode);
}

/**
 * VarDeclaration ::= IDENT EQUALS Expression
 */
export function acceptVarDeclaration(parser: Parser) {
    return parser.accept([
        { name: 'varIdentToken', type: 'IDENT' },
        { name: 'equalsToken', type: 'EQUALS', definite: true },
        { name: 'initialValue', parse: acceptExpression, mess: mess.INVALID_INITIAL_VALUE },
    ], exprs.STVarDeclaration);
}

/**
 * ShorthandLambdaExpression ::= IDENT FAT_ARROW FunctionBody
 */
export function acceptShorthandLambdaExpression(parser: Parser) {
    return parser.accept([
        { name: 'shorthandParam', type: 'IDENT' },
        { name: 'fatArrowToken', type: 'FAT_ARROW', definite: true },
        { name: 'functionBody', parse: acceptFunctionBody },
    ], exprs.STLambdaExpression);
}

/**
 * ArrayLiteral ::= LBRACK Expression(* sep COMMA) RBRACK
 */
export function acceptArrayLiteral(parser: Parser) {
    return parser.accept([
        { name: 'openBracketToken', type: 'LBRACK', definite: true },
        { name: 'items', parse: acceptExpression, zeroOrMore: true, mess: mess.INVALID_EXPRESSION, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeBracketToken', type: 'RBRACK' },
    ], exprs.STArrayLiteral);
}

/**
 * StructLiteral ::= LBRACE StructEntry(* sep COMMA) RBRACE
 */
export function acceptStructLiteral(parser: Parser) {
    return parser.accept([
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'entries', parse: acceptStructEntry, zeroOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeBraceToken', type: 'RBRACE' },
    ], exprs.STStructLiteral);
}

/**
 * StructEntry ::= IDENT COLON Expression
 */
export function acceptStructEntry(parser: Parser) {
    return parser.accept([
        { name: 'keyToken', type: 'IDENT', definite: true },
        { name: 'colonToken', type: 'COLON', mess: mess.STRUCT_LITERAL_MISSING_COLON },
        { name: 'value', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], exprs.STStructEntry);
}

/**
 * IfElseExpression ::= IF LPAREN Expression RPAREN Expression ELSE Expression
 */
export function acceptIfElseExpression(parser: Parser) {
    return parser.accept([
        { name: 'ifToken', type: 'IF', definite: true },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.IF_MISSING_OPEN_PAREN },
        { name: 'condition', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.IF_MISSING_CLOSE_PAREN },
        { name: 'consequent', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'elseToken', type: 'ELSE', mess: mess.IF_MISSING_ELSE },
        { name: 'alternate', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], exprs.STIfElseExpression);
}

/**
 * PrefixExpression ::= OPER+ Expression
 */
export function acceptPrefixExpression(parser: Parser) {
    return parser.accept([
        // operators have to be parsed as oneOrMore because < and > screw everything up
        { name: 'operatorToken', type: 'OPER', definite: true, oneOrMore: true },
        { name: 'target', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], exprs.STPrefixExpression);
}

/**
 * LambdaExpression ::= LPAREN LambdaParam(* sep COMMA) RPAREN FAT_ARROW FunctionBody
 */
export function acceptLambdaExpression(parser: Parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'params', parse: acceptLambdaParam, zeroOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN' },
        { name: 'fatArrowToken', type: 'FAT_ARROW', definite: true },
        { name: 'functionBody', parse: acceptFunctionBody, mess: mess.INVALID_FUNCTION_BODY },
    ], exprs.STLambdaExpression);
}

/**
 * LambdaParam ::= Param | IDENT
 */
export function acceptLambdaParam(parser: Parser) {
    return parser.acceptOneOf([
        { parse: acceptParam },
        { type: 'IDENT' },
    ], exprs.STLambdaParam);
}

/**
 * ParenthesizedExpression ::= LPAREN Expression RPAREN
 */
export function acceptParenthesizedExpression(parser: Parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'inner', parse: acceptExpression },
        { name: 'closeParenToken', type: 'RPAREN', definite: true },
    ], exprs.STParenthesizedExpression);
}

/**
 * TupleLiteral ::= LPAREN Expression(* sep COMMA) RPAREN
 */
export function acceptTupleLiteral(parser: Parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN', definite: true },
        { name: 'items', parse: acceptExpression, zeroOrMore: true, mess: mess.INVALID_EXPRESSION, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN' },
    ], exprs.STTupleLiteral);
}

/**
 * FunctionApplicationSuffix ::= TypeArgList? LPAREN Expression(* sep COMMA) RPAREN
 */
export function acceptFunctionApplicationSuffix(parser: Parser) {
    return parser.accept([
        { name: 'typeArgList', parse: acceptTypeArgList, optional: true },
        { name: 'openParenToken', type: 'LPAREN', definite: true },
        { name: 'args', parse: acceptExpression, zeroOrMore: true, mess: mess.INVALID_EXPRESSION, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN' },
    ], exprs.STFunctionApplication);
}

/**
 * BinaryExpressionSuffix ::= OPER+ Expression
 */
export function acceptBinaryExpressionSuffix(parser: Parser) {
    return parser.accept([
        // operators have to be parsed as oneOrMore because < and > screw everything up
        { name: 'operatorToken', type: 'OPER', oneOrMore: true },
        { name: 'right', parse: acceptExpression, definite: true },
    ], exprs.STBinaryExpression);
}

/**
 * PostfixExpressionSuffix ::= OPER+
 */
export function acceptPostfixExpressionSuffix(parser: Parser) {
    return parser.accept([
        // operators have to be parsed as oneOrMore because < and > screw everything up
        { name: 'operatorToken', type: 'OPER', definite: true, oneOrMore: true },
    ], exprs.STPostfixExpression);
}

/**
 * FieldAccessSuffix ::= DOT IDENT
 */
export function acceptFieldAccessSuffix(parser: Parser) {
    return parser.accept([
        { name: 'dotToken', type: 'DOT', definite: true },
        { name: 'fieldNameToken', type: 'IDENT', mess: mess.FIELD_ACCESS_INVALID_FIELD_NAME },
    ], exprs.STFieldAccess);
}

/**
 * ArrayAccessSuffix ::= LBRACK Expression RBRACK
 */
export function acceptArrayAccessSuffix(parser: Parser) {
    return parser.accept([
        { name: 'openBracketToken', type: 'LBRACK', definite: true },
        { name: 'indexExp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeBracketToken', type: 'RBRACK', mess: mess.ARRAY_ACCESS_MISSING_CLOSE_BRACKET },
    ], exprs.STArrayAccess);
}

// /////////////
// STATEMENTS //
// /////////////

/**
 * Statement ::= Block
 *               Expression |
 *               ForStatement |
 *               WhileStatement |
 *               DoWhileStatement |
 *               TryCatchStatement |
 *               ReturnStatement |
 *               ThrowStatement |
 *               BreakStatement |
 *               ContinueStatement
 */
export function acceptStatement(parser: Parser): stmts.STStatement {
    return parser.acceptOneOf([
        { parse: acceptBlock },
        { parse: acceptExpression },
        { parse: acceptForStatement },
        { parse: acceptWhileStatement },
        { parse: acceptDoWhileStatement },
        { parse: acceptTryCatchStatement },
        { parse: acceptThrowStatement },
        { parse: acceptReturnStatement },
        { parse: acceptBreakStatement },
        { parse: acceptContinueStatement },
    ], stmts.STStatementNode);
}

/**
 * Block ::= LBRACE Statement* RBRACE
 */
export function acceptBlock(parser: Parser) {
    return parser.accept([
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'statements', parse: acceptStatement, zeroOrMore: true },
        { name: 'closeBraceToken', type: 'RBRACE', mess: mess.MISSING_CLOSE_BRACE },
    ], stmts.STBlock);
}

/**
 * ForStatement ::= FOR LPAREN IDENT IN Expression RPAREN Block
 */
export function acceptForStatement(parser: Parser) {
    return parser.accept([
        { name: 'forToken', type: 'FOR', definite: true },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.FOR_MISSING_OPEN_PAREN },
        { name: 'iterVarToken', type: 'IDENT', mess: mess.FOR_INVALID_ITER_IDENT },
        { name: 'inToken', type: 'IN', mess: mess.FOR_MISSING_IN },
        { name: 'iterableExp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.FOR_MISSING_CLOSE_PAREN },
        { name: 'body', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
    ], stmts.STForStatement);
}

/**
 * WhileStatement ::= WHILE LPAREN Expression RPAREN Block
 */
export function acceptWhileStatement(parser: Parser) {
    return parser.accept([
        { name: 'whileToken', type: 'WHILE', definite: true },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.WHILE_MISSING_OPEN_PAREN },
        { name: 'conditionExp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.WHILE_MISSING_CLOSE_PAREN },
        { name: 'body', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
    ], stmts.STWhileStatement);
}

/**
 * DoWhileStatement ::= DO Block WHILE LPAREN Expression RPAREN
 */
export function acceptDoWhileStatement(parser: Parser) {
    return parser.accept([
        { name: 'doToken', type: 'DO', definite: true },
        { name: 'body', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
        { name: 'whileToken', type: 'WHILE', mess: mess.DO_WHILE_MISSING_WHILE },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.WHILE_MISSING_OPEN_PAREN },
        { name: 'conditionExp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.WHILE_MISSING_CLOSE_PAREN },
    ], stmts.STDoWhileStatement);
}

/**
 * TryCatchStatement ::= TRY Statement CatchClause+ FinallyClause?
 */
export function acceptTryCatchStatement(parser: Parser) {
    return parser.accept([
        { name: 'tryToken', type: 'TRY', definite: true },
        { name: 'tryBody', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
        { name: 'catches', parse: acceptCatchClause, oneOrMore: true, mess: mess.TRY_CATCH_MISSING_CATCH },
        { name: 'finally', parse: acceptFinallyClause, optional: true },
    ], stmts.STTryCatchStatement);
}

/**
 * CatchClause ::= CATCH LPAREN Param RPAREN Statement
 */
export function acceptCatchClause(parser: Parser) {
    return parser.accept([
        { name: 'catchToken', type: 'CATCH', mess: mess.TRY_CATCH_MISSING_CATCH, definite: true },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.TRY_CATCH_MISSING_OPEN_PAREN },
        { name: 'param', parse: acceptParam, mess: mess.CATCH_INVALID_PARAM },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.TRY_CATCH_MISSING_CLOSE_PAREN },
        { name: 'body', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
    ], stmts.STCatchClause);
}

/**
 * FinallyClause ::= FINALLY Statement
 */
export function acceptFinallyClause(parser: Parser) {
    return parser.accept([
        { name: 'finallyToken', type: 'FINALLY', definite: true },
        { name: 'body', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
    ], stmts.STFinallyClause);
}

/**
 * ThrowStatement ::= THROW Expression
 */
export function acceptThrowStatement(parser: Parser) {
    return parser.accept([
        { name: 'throwToken', type: 'THROW', definite: true },
        { name: 'exp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], stmts.STThrowStatement);
}

/**
 * ReturnStatement ::= RETURN Expression?
 */
export function acceptReturnStatement(parser: Parser) {
    return parser.accept([
        { name: 'returnToken', type: 'RETURN', definite: true },
        { name: 'exp', parse: acceptExpression, optional: true, mess: mess.INVALID_EXPRESSION },
    ], stmts.STReturnStatement);
}

/**
 * BreakStatement ::= BREAK INTEGER_LITERAL?
 */
export function acceptBreakStatement(parser: Parser) {
    return parser.accept([
        { name: 'breakToken', type: 'BREAK', definite: true },
        { name: 'loopNumber', type: 'INTEGER_LITERAL', optional: true },
    ], stmts.STBreakStatement);
}

/**
 * ContinueStatement ::= CONTINUE INTEGER_LITERAL?
 */
export function acceptContinueStatement(parser: Parser) {
    return parser.accept([
        { name: 'continueToken', type: 'CONTINUE', definite: true },
        { name: 'loopNumber', type: 'INTEGER_LITERAL', optional: true },
    ], stmts.STContinueStatement);
}
