import * as decls from '../ast/declarations';
import * as _types from '../ast/types';
import * as exprs from '../ast/expressions';
import * as stmts from '../ast/statements';
import * as mess from './ParserMessages';


const AST = { ...decls, ..._types, ...exprs, ...stmts };

// ///////////////
// DECLARATIONS //
// ///////////////

/**
 * Program ::= ImportDeclaration* Declaration*
 */
export function acceptProgram(parser) {
    return parser.accept([
        { name: 'imports', parse: acceptImportDeclaration, zeroOrMore: true },
        { name: 'declarations', parse: acceptDeclaration, zeroOrMore: true },
        { name: 'eof', type: 'EOF', definite: true },
    ], AST.Program);
}

/**
 * ImportDeclaration ::= IMPORT FROM STRING_LITERAL COLON ImportList
 */
export function acceptImportDeclaration(parser) {
    return parser.accept([
        { name: 'importToken', type: 'IMPORT', definite: true },
        { name: 'fromToken', type: 'FROM', mess: mess.INVALID_IMPORT },
        { name: 'moduleNameToken', type: 'STRING_LITERAL', mess: mess.INVALID_IMPORT_MODULE },
        { name: 'colonToken', type: 'COLON', mess: mess.INVALID_IMPORT },
        { name: 'imports', parse: acceptImportList, mess: mess.INVALID_IMPORT },
    ], AST.ImportDeclaration);
}

/**
 * ImportList ::= IDENT | NamedImports
 */
export function acceptImportList(parser) {
    return parser.accept([{
        choices: [
            { name: 'defaultImportNameToken', type: 'IDENT' },
            { name: 'namedImports', parse: acceptNamedImports },
        ],
    }], AST.ImportList);
}

/**
 * NamedImports ::= LBRACE ImportComponent(+ sep COMMA) RBRACE
 */
export function acceptNamedImports(parser) {
    return parser.accept([
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'importComponents', parse: acceptImportComponent, mess: mess.INVALID_IMPORT, oneOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeBraceToken', type: 'RBRACE', mess: mess.INVALID_IMPORT },
    ], AST.NamedImports);
}

/**
 * ImportComponent ::= IDENT | ImportWithAlias
 */
export function acceptImportComponent(parser) {
    return parser.accept([{
        choices: [
            { name: 'importWithAlias', parse: acceptImportWithAlias },
            { name: 'importNameToken', type: 'IDENT' },
        ],
    }], AST.ImportComponent);
}

/**
 * ImportWithAlias ::= IDENT AS IDENT
 */
export function acceptImportWithAlias(parser) {
    return parser.accept([
        { name: 'importNameToken', type: 'IDENT' },
        { name: 'asToken', type: 'AS', definite: true },
        { name: 'importAliasToken', type: 'IDENT', mess: mess.INVALID_IMPORT },
    ], AST.ImportWithAlias);
}

/**
 * Declaration ::= FunctionDeclaration | TypeDeclaration | ExportDeclaration
 */
export function acceptDeclaration(parser) {
    return parser.accept([{
        choices: [
            { name: 'function', parse: acceptFunctionDeclaration },
            { name: 'typeNode', parse: acceptTypeDeclaration },
            { name: 'export', parse: acceptExportDeclaration },
        ],
    }], AST.Declaration);
}

/**
 * FunctionDeclaration ::= FUNC Type IDENT TypeParamList? ParameterList FAT_ARROW FunctionBody
 */
export function acceptFunctionDeclaration(parser) {
    return parser.accept([
        { name: 'funcToken', type: 'FUNC', definite: true },
        { name: 'returnType', parse: acceptType, mess: mess.INVALID_RETURN_TYPE },
        { name: 'functionNameToken', type: 'IDENT', mess: mess.INVALID_FUNCTION_NAME },
        { name: 'typeParamList', parse: acceptTypeParamList, optional: true },
        { name: 'params', parse: acceptParameterList, mess: mess.INVALID_PARAMETER_LIST },
        { name: 'fatArrowToken', type: 'FAT_ARROW', mess: mess.INVALID_FAT_ARROW },
        { name: 'functionBody', parse: acceptFunctionBody },
    ], AST.FunctionDeclaration);
}

/**
 * ParameterList ::= LPAREN Param(* sep COMMA) RPAREN
 */
export function acceptParameterList(parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN', definite: true },
        { name: 'params', parse: acceptParam, zeroOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.MISSING_CLOSE_PAREN },
    ], AST.ParameterList);
}

/**
 * Param ::= Type IDENT
 */
export function acceptParam(parser) {
    return parser.accept([
        { name: 'typeNode', parse: acceptType, mess: mess.INVALID_PARAMETER_TYPE, definite: true },
        { name: 'nameToken', type: 'IDENT', mess: mess.INVALID_PARAMETER_NAME },
    ], AST.Param);
}

/**
 * FunctionBody ::= Block | Expression | Statement
 *
 * Function bodies are complicated because there is ambiguity between blocks
 * and struct literals. We make blocks take priority because they are more loose
 * in structure.
 */
export function acceptFunctionBody(parser) {
    return parser.accept([{
        choices: [
            { name: 'blockBody', parse: acceptBlock },
            { name: 'expressionBody', parse: acceptExpression },
            { name: 'statementBody', parse: acceptStatement },
        ],
    }], AST.FunctionBody);
}

/**
 * TypeDeclaration ::= TYPE IDENT TypeParamList? EQUALS Type
 */
export function acceptTypeDeclaration(parser) {
    return parser.accept([
        { name: 'typeToken', type: 'TYPE', definite: true },
        { name: 'typeNameToken', type: 'IDENT', mess: mess.INVALID_TYPE_NAME },
        { name: 'typeParamList', parse: acceptTypeParamList, optional: true },
        { name: 'equalsToken', type: 'EQUALS', mess: mess.TYPE_DECL_MISSING_EQUALS },
        { name: 'typeNode', parse: acceptType, mess: mess.INVALID_TYPE },
    ], AST.TypeDeclaration);
}

/**
 * ExportDeclaration ::= EXPORT ExportName ExportValue
 */
export function acceptExportDeclaration(parser) {
    return parser.accept([
        { name: 'exportToken', type: 'EXPORT', definite: true },
        { name: 'exportName', parse: acceptExportName },
        { name: 'exportDefinition', parse: acceptExportValue },
    ], AST.ExportDeclaration);
}

/**
 * ExportName ::= DEFAULT | NamedExport
 */
export function acceptExportName(parser) {
    return parser.accept([{
        choices: [
            { name: 'defaultToken', type: 'DEFAULT' },
            { name: 'namedExport', parse: acceptNamedExport },
        ],
    }], AST.ExportName);
}

/**
 * NamedExport ::= IDENT EQUALS
 */
export function acceptNamedExport(parser) {
    return parser.accept([
        { name: 'exportNameToken', type: 'IDENT', definite: true },
        { name: 'equalsToken', type: 'EQUALS' },
    ], AST.NamedExport);
}

/**
 * ExportValue ::= FunctionDeclaration | TypeDeclaration | Expression
 */
export function acceptExportValue(parser) {
    return parser.accept([{
        choices: [
            { name: 'functionDeclaration', parse: acceptFunctionDeclaration },
            { name: 'typeDeclaration', parse: acceptTypeDeclaration },
            { name: 'expression', parse: acceptExpression },
        ],
    }], AST.ExportValue);
}

/**
 * TypeParamList ::= LT TypeParam(+ sep COMMA) GT
 */
export function acceptTypeParamList(parser) {
    return parser.accept([
        { name: 'openLtToken', image: '<' },
        { name: 'typeParams', parse: acceptTypeParam, mess: mess.INVALID_TYPE_PARAM, oneOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeGtToken', image: '>', definite: true },
    ], AST.TypeParamList);
}

/**
 * TypeParam ::= VarianceOp? IDENT TypeConstraint?
 */
export function acceptTypeParam(parser) {
    return parser.accept([
        { name: 'varianceOp', parse: acceptVarianceOp, optional: true, definite: true },
        { name: 'identToken', type: 'IDENT', mess: mess.INVALID_TYPE_PARAM, definite: true },
        { name: 'typeConstraint', parse: acceptTypeConstraint, optional: true },
    ], AST.TypeParam);
}

/**
 * VarianceOp ::= PLUS | MINUS
 */
export function acceptVarianceOp(parser) {
    return parser.accept([{
        choices: [
            { name: 'covariantToken', image: '+' },
            { name: 'contravariantToken', image: '-' },
        ],
    }], AST.VarianceOp);
}

/**
 * TypeConstraint ::= ConstraintOp Type
 */
export function acceptTypeConstraint(parser) {
    return parser.accept([
        { name: 'constraintOp', parse: acceptConstraintOp, definite: true },
        { name: 'constraintType', parse: acceptType, mess: mess.INVALID_TYPE_PARAM },
    ], AST.TypeConstraint);
}

/**
 * ConstraintOp ::= COLON | ASS_FROM
 */
export function acceptConstraintOp(parser) {
    return parser.accept([{
        choices: [
            { name: 'assignableToToken', type: 'COLON' },
            { name: 'assignableFromToken', type: 'ASS_FROM' },
        ],
    }], AST.ConstraintOp);
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
 *          GenericType |          # Generic type
 *          IDENT |                # Already defined type
 *          Type TypeSuffix
 *
 * TypeSuffix ::= ArrayTypeSuffix
 *              | UnionTypeSuffix
 */
export function acceptType(parser) {
    return parser.accept([{
        leftRecursive: {
            bases: [
                { name: 'builtIn', type: 'U8' }, { name: 'builtIn', type: 'I8' }, { name: 'builtIn', type: 'BYTE' },
                { name: 'builtIn', type: 'U16' }, { name: 'builtIn', type: 'I16' }, { name: 'builtIn', type: 'SHORT' },
                { name: 'builtIn', type: 'U32' }, { name: 'builtIn', type: 'I32' }, { name: 'builtIn', type: 'INTEGER' },
                { name: 'builtIn', type: 'U64' }, { name: 'builtIn', type: 'I64' }, { name: 'builtIn', type: 'LONG' },
                { name: 'builtIn', type: 'INT' },
                { name: 'builtIn', type: 'F32' }, { name: 'builtIn', type: 'FLOAT' },
                { name: 'builtIn', type: 'F64' }, { name: 'builtIn', type: 'DOUBLE' },
                { name: 'builtIn', type: 'STRING' },
                { name: 'builtIn', type: 'CHAR' },
                { name: 'builtIn', type: 'BOOL' },
                { name: 'builtIn', type: 'VOID' },
                { name: 'builtIn', type: 'ANY' },
                { name: 'structType', parse: acceptStructType },
                { name: 'functionType', parse: acceptFunctionType },
                { name: 'inner', parse: acceptParenthesizedType },
                { name: 'tupleType', parse: acceptTupleType },
                { name: 'genericType', parse: acceptGenericType },
                { name: 'nameToken', type: 'IDENT' },
            ],
            suffixes: [
                { name: 'arrayType', baseName: 'baseType', parse: acceptArrayTypeSuffix },
                { name: 'unionType', baseName: 'left', parse: acceptUnionTypeSuffix },
            ],
        },
    }], AST.Type);
}

/**
 * StructType ::= LBRACE Field* RBRACE
 */
export function acceptStructType(parser) {
    return parser.accept([
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'fields', parse: acceptField, zeroOrMore: true },
        { name: 'closeBraceToken', type: 'RBRACE', mess: mess.INVALID_STRUCT_NO_CLOSE_BRACE },
    ], AST.StructType);
}

/**
 * Field ::= Type IDENT
 */
export function acceptField(parser) {
    return parser.accept([
        { name: 'typeNode', parse: acceptType, mess: mess.INVALID_FIELD_TYPE, definite: true },
        { name: 'nameToken', type: 'IDENT', mess: mess.INVALID_FIELD_NAME },
    ], AST.Field);
}

/**
 * FunctionType ::= LPAREN Type(* sep COMMA) RPAREN FAT_ARROW Type
 */
export function acceptFunctionType(parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'paramTypes', parse: acceptType, zeroOrMore: true, mess: mess.INVALID_TYPE, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN' },
        { name: 'fatArrowToken', type: 'FAT_ARROW', definite: true },
        { name: 'returnType', parse: acceptType, mess: mess.FUNCTION_TYPE_INVALID_RETURN_TYPE },
    ], AST.FunctionType);
}

/**
 * ParenthesizedType ::= LPAREN Type RPAREN
 */
export function acceptParenthesizedType(parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'paramTypes', parse: acceptType, mess: mess.INVALID_TYPE },
        { name: 'closeParenToken', type: 'RPAREN', definite: true },
    ], AST.ParenthesizedType);
}

/**
 * TupleType ::= LPAREN Type(* sep COMMA) RPAREN
 */
export function acceptTupleType(parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'paramTypes', parse: acceptType, zeroOrMore: true, mess: mess.INVALID_TYPE, sep: { name: 'commaTokens', type: 'COMMA', definite: true } },
        { name: 'closeParenToken', type: 'RPAREN' },
    ], AST.TupleType);
}

/**
 * GenericType ::= IDENT TypeArgList
 */
export function acceptGenericType(parser) {
    return parser.accept([
        { name: 'identToken', type: 'IDENT' },
        { name: 'typeArgList', parse: acceptTypeArgList, definite: true },
    ], AST.GenericType);
}

/**
 * TypeArgList ::= LT Type(* sep COMMA) GT
 */
export function acceptTypeArgList(parser) {
    return parser.accept([
        { name: 'openLtToken', image: '<', definite: true },
        { name: 'types', parse: acceptType, zeroOrMore: true, mess: mess.INVALID_TYPE_ARGUMENT, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeGtToken', image: '>', mess: mess.INVALID_TYPE_ARG_LIST },
    ], AST.TypeArgList);
}

/**
 * ArrayTypeSuffix ::= LBRACK RBRACK
 */
export function acceptArrayTypeSuffix(parser) {
    return parser.accept([
        { name: 'openBracketToken', type: 'LBRACK', definite: true },
        { name: 'closeBracketToken', type: 'RBRACK' },
    ], AST.ArrayType);
}

/**
 * UnionTypeSuffix ::= VBAR Type
 */
export function acceptUnionTypeSuffix(parser) {
    return parser.accept([
        { name: 'vbarToken', image: '|', definite: true },
        { name: 'right', parse: acceptType, mess: mess.INVALID_UNION_TYPE },
    ], AST.UnionType);
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
export function acceptExpression(parser) {
    return parser.accept([{
        leftRecursive: {
            bases: [
                { name: 'integerLiteralToken', type: 'INTEGER_LITERAL' },
                { name: 'floatLiteralToken', type: 'FLOAT_LITERAL' },
                { name: 'stringLiteralToken', type: 'STRING_LITERAL' },
                { name: 'charLiteralToken', type: 'CHARACTER_LITERAL' },
                { name: 'boolLiteralToken', type: 'TRUE' },
                { name: 'boolLiteralToken', type: 'FALSE' },
                { name: 'varDecl', parse: acceptVarDeclaration },
                { name: 'lambda', parse: acceptShorthandLambdaExpression },
                { name: 'identToken', type: 'IDENT' },
                { name: 'arrayLiteral', parse: acceptArrayLiteral },
                { name: 'structLiteral', parse: acceptStructLiteral },
                { name: 'ifElse', parse: acceptIfElseExpression },
                { name: 'unary', parse: acceptPrefixExpression },
                { name: 'lambda', parse: acceptLambdaExpression },
                { name: 'inner', parse: acceptParenthesizedExpression },
                { name: 'tupleLiteral', parse: acceptTupleLiteral },
            ],
            suffixes: [
                { name: 'functionApplication', baseName: 'target', parse: acceptFunctionApplicationSuffix },
                { name: 'binary', baseName: 'left', parse: acceptBinaryExpressionSuffix },
                { name: 'unary', baseName: 'target', parse: acceptPostfixExpressionSuffix },
                { name: 'fieldAccess', baseName: 'target', parse: acceptFieldAccessSuffix },
                { name: 'arrayAccess', baseName: 'target', parse: acceptArrayAccessSuffix },
            ],
        },
    }], AST.Expression);
}

/**
 * VarDeclaration ::= IDENT EQUALS Expression
 */
export function acceptVarDeclaration(parser) {
    return parser.accept([
        { name: 'varIdentToken', type: 'IDENT' },
        { name: 'equalsToken', type: 'EQUALS', definite: true },
        { name: 'initialValue', parse: acceptExpression, mess: mess.INVALID_INITIAL_VALUE },
    ], AST.VarDeclaration);
}

/**
 * ShorthandLambdaExpression ::= IDENT FAT_ARROW FunctionBody
 */
export function acceptShorthandLambdaExpression(parser) {
    return parser.accept([
        { name: 'shorthandParam', type: 'IDENT' },
        { name: 'fatArrowToken', type: 'FAT_ARROW', definite: true },
        { name: 'body', parse: acceptFunctionBody },
    ], AST.LambdaExpression);
}

/**
 * ArrayLiteral ::= LBRACK Expression(* sep COMMA) RBRACK
 */
export function acceptArrayLiteral(parser) {
    return parser.accept([
        { name: 'openBracketToken', type: 'LBRACK', definite: true },
        { name: 'items', parse: acceptExpression, zeroOrMore: true, mess: mess.INVALID_EXPRESSION, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeBracketToken', type: 'RBRACK' },
    ], AST.ArrayLiteral);
}

/**
 * StructLiteral ::= LBRACE StructEntry(* sep COMMA) RBRACE
 */
export function acceptStructLiteral(parser) {
    return parser.accept([
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'entries', parse: acceptStructEntry, zeroOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeBraceToken', type: 'RBRACE' },
    ], AST.StructLiteral);
}

/**
 * StructEntry ::= IDENT COLON Expression
 */
export function acceptStructEntry(parser) {
    return parser.accept([
        { name: 'keyToken', type: 'IDENT', definite: true },
        { name: 'colonToken', type: 'COLON', mess: mess.STRUCT_LITERAL_MISSING_COLON },
        { name: 'value', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], AST.StructEntry);
}

/**
 * IfElseExpression ::= IF LPAREN Expression RPAREN Expression ELSE Expression
 */
export function acceptIfElseExpression(parser) {
    return parser.accept([
        { name: 'ifToken', type: 'IF', definite: true },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.IF_MISSING_OPEN_PAREN },
        { name: 'condition', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.IF_MISSING_CLOSE_PAREN },
        { name: 'consequent', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'elseToken', type: 'ELSE', mess: mess.IF_MISSING_ELSE },
        { name: 'alternate', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], AST.IfElseExpression);
}

/**
 * PrefixExpression ::= OPER+ Expression
 */
export function acceptPrefixExpression(parser) {
    return parser.accept([
        // operators have to be parsed as oneOrMore because < and > screw everything up
        { name: 'operatorToken', type: 'OPER', definite: true, oneOrMore: true },
        { name: 'target', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], AST.PrefixExpression);
}

/**
 * LambdaExpression ::= LPAREN LambdaParam(* sep COMMA) RPAREN FAT_ARROW FunctionBody
 */
export function acceptLambdaExpression(parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'params', parse: acceptLambdaParam, zeroOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN' },
        { name: 'fatArrowToken', type: 'FAT_ARROW', definite: true },
        { name: 'functionBody', parse: acceptFunctionBody, mess: mess.INVALID_FUNCTION_BODY },
    ], AST.LambdaExpression);
}

/**
 * LambdaParam ::= Param | IDENT
 */
export function acceptLambdaParam(parser) {
    return parser.accept([{
        choices: [
            { name: 'typedParam', parse: acceptParam },
            { name: 'identToken', type: 'IDENT' },
        ],
    }], AST.LambdaParam);
}

/**
 * ParenthesizedExpression ::= LPAREN Expression RPAREN
 */
export function acceptParenthesizedExpression(parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'inner', parse: acceptExpression },
        { name: 'closeParenToken', type: 'RPAREN', definite: true },
    ], AST.ParenthesizedExpression);
}

/**
 * TupleLiteral ::= LPAREN Expression(* sep COMMA) RPAREN
 */
export function acceptTupleLiteral(parser) {
    return parser.accept([
        { name: 'openParenToken', type: 'LPAREN', definite: true },
        { name: 'items', parse: acceptExpression, zeroOrMore: true, mess: mess.INVALID_EXPRESSION, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN' },
    ], AST.TupleLiteral);
}

/**
 * FunctionApplicationSuffix ::= TypeArgList? LPAREN Expression(* sep COMMA) RPAREN
 */
export function acceptFunctionApplicationSuffix(parser) {
    return parser.accept([
        { name: 'typeArgList', parse: acceptTypeArgList, optional: true },
        { name: 'openParenToken', type: 'LPAREN', definite: true },
        { name: 'args', parse: acceptExpression, zeroOrMore: true, mess: mess.INVALID_EXPRESSION, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN' },
    ], AST.FunctionApplication);
}

/**
 * BinaryExpressionSuffix ::= OPER+ Expression
 */
export function acceptBinaryExpressionSuffix(parser) {
    return parser.accept([
        // operators have to be parsed as oneOrMore because < and > screw everything up
        { name: 'operatorToken', type: 'OPER', oneOrMore: true },
        { name: 'right', parse: acceptExpression, definite: true },
    ], AST.BinaryExpression);
}

/**
 * PostfixExpressionSuffix ::= OPER+
 */
export function acceptPostfixExpressionSuffix(parser) {
    return parser.accept([
        // operators have to be parsed as oneOrMore because < and > screw everything up
        { name: 'operatorToken', type: 'OPER', definite: true, oneOrMore: true },
    ], AST.PostfixExpression);
}

/**
 * FieldAccessSuffix ::= DOT IDENT
 */
export function acceptFieldAccessSuffix(parser) {
    return parser.accept([
        { name: 'dotToken', type: 'DOT', definite: true },
        { name: 'fieldNameToken', type: 'IDENT', mess: mess.FIELD_ACCESS_INVALID_FIELD_NAME },
    ], AST.FieldAccess);
}

/**
 * ArrayAccessSuffix ::= LBRACK Expression RBRACK
 */
export function acceptArrayAccessSuffix(parser) {
    return parser.accept([
        { name: 'openBracketToken', type: 'LBRACK', definite: true },
        { name: 'indexExp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeBracketToken', type: 'RBRACK', mess: mess.ARRAY_ACCESS_MISSING_CLOSE_BRACKET },
    ], AST.ArrayAccess);
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
export function acceptStatement(parser) {
    return parser.accept([{
        choices: [
            { name: 'block', parse: acceptBlock },
            { name: 'exp', parse: acceptExpression },
            { name: 'for', parse: acceptForStatement },
            { name: 'while', parse: acceptWhileStatement },
            { name: 'doWhile', parse: acceptDoWhileStatement },
            { name: 'tryCatch', parse: acceptTryCatchStatement },
            { name: 'throw', parse: acceptThrowStatement },
            { name: 'return', parse: acceptReturnStatement },
            { name: 'break', parse: acceptBreakStatement },
            { name: 'continue', parse: acceptContinueStatement },
        ],
    }], AST.Statement);
}

/**
 * Block ::= LBRACE Statement* RBRACE
 */
export function acceptBlock(parser) {
    return parser.accept([
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'statements', parse: acceptStatement, zeroOrMore: true },
        { name: 'closeBraceToken', type: 'RBRACE', mess: mess.MISSING_CLOSE_BRACE },
    ], AST.Block);
}

/**
 * ForStatement ::= FOR LPAREN IDENT IN Expression RPAREN Block
 */
export function acceptForStatement(parser) {
    return parser.accept([
        { name: 'forToken', type: 'FOR', definite: true },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.FOR_MISSING_OPEN_PAREN },
        { name: 'iterVarToken', type: 'IDENT', mess: mess.FOR_INVALID_ITER_IDENT },
        { name: 'inToken', type: 'IN', mess: mess.FOR_MISSING_IN },
        { name: 'iterableExp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.FOR_MISSING_CLOSE_PAREN },
        { name: 'body', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
    ], AST.ForStatement);
}

/**
 * WhileStatement ::= WHILE LPAREN Expression RPAREN Block
 */
export function acceptWhileStatement(parser) {
    return parser.accept([
        { name: 'whileToken', type: 'WHILE', definite: true },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.WHILE_MISSING_OPEN_PAREN },
        { name: 'conditionExp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.WHILE_MISSING_CLOSE_PAREN },
        { name: 'body', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
    ], AST.WhileStatement);
}

/**
 * DoWhileStatement ::= DO Block WHILE LPAREN Expression RPAREN
 */
export function acceptDoWhileStatement(parser) {
    return parser.accept([
        { name: 'doToken', type: 'DO', definite: true },
        { name: 'body', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
        { name: 'whileToken', type: 'WHILE', mess: mess.DO_WHILE_MISSING_WHILE },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.WHILE_MISSING_OPEN_PAREN },
        { name: 'conditionExp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.WHILE_MISSING_CLOSE_PAREN },
    ], AST.DoWhileStatement);
}

/**
 * TryCatchStatement ::= TRY Statement CatchClause+ FinallyClause?
 */
export function acceptTryCatchStatement(parser) {
    return parser.accept([
        { name: 'tryToken', type: 'TRY', definite: true },
        { name: 'tryBody', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
        { name: 'catches', parse: acceptCatchClause, oneOrMore: true, mess: mess.TRY_CATCH_MISSING_CATCH },
        { name: 'finally', parse: acceptFinallyClause, optional: true },
    ], AST.TryCatchStatement);
}

/**
 * CatchClause ::= CATCH LPAREN Param RPAREN Statement
 */
export function acceptCatchClause(parser) {
    return parser.accept([
        { name: 'catchToken', type: 'CATCH', mess: mess.TRY_CATCH_MISSING_CATCH, definite: true },
        { name: 'openParenToken', type: 'LPAREN', mess: mess.TRY_CATCH_MISSING_OPEN_PAREN },
        { name: 'param', parse: acceptParam, mess: mess.CATCH_INVALID_PARAM },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.TRY_CATCH_MISSING_CLOSE_PAREN },
        { name: 'body', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
    ], AST.CatchClause);
}

/**
 * FinallyClause ::= FINALLY Statement
 */
export function acceptFinallyClause(parser) {
    return parser.accept([
        { name: 'finallyToken', type: 'FINALLY', definite: true },
        { name: 'finallyBlock', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
    ], AST.FinallyClause);
}

/**
 * ThrowStatement ::= THROW Expression
 */
export function acceptThrowStatement(parser) {
    return parser.accept([
        { name: 'throwToken', type: 'THROW', definite: true },
        { name: 'exp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], AST.ThrowStatement);
}

/**
 * ReturnStatement ::= RETURN Expression?
 */
export function acceptReturnStatement(parser) {
    return parser.accept([
        { name: 'returnToken', type: 'RETURN', definite: true },
        { name: 'exp', parse: acceptExpression, optional: true, mess: mess.INVALID_EXPRESSION },
    ], AST.ReturnStatement);
}

/**
 * BreakStatement ::= BREAK INTEGER_LITERAL?
 */
export function acceptBreakStatement(parser) {
    return parser.accept([
        { name: 'breakToken', type: 'BREAK', definite: true },
        { name: 'loopNumber', type: 'INTEGER_LITERAL', optional: true },
    ], AST.BreakStatement);
}

/**
 * ContinueStatement ::= CONTINUE INTEGER_LITERAL?
 */
export function acceptContinueStatement(parser) {
    return parser.accept([
        { name: 'continueToken', type: 'CONTINUE', definite: true },
        { name: 'loopNumber', type: 'INTEGER_LITERAL', optional: true },
    ], AST.ContinueStatement);
}
