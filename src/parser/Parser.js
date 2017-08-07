import Tokenizer from './Tokenizer';
import LookaheadIterator from './LookaheadIterator';
import NewLineCheckIterator from './NewLineCheckIterator';
import * as decls from '../ast/declarations';
import * as _types from '../ast/types';
import * as exprs from '../ast/expressions';
import * as stmts from '../ast/statements';
import ParserError from './ParserError';
import * as mess from './ParserMessages';


const AST = { ...decls, ..._types, ...exprs, ...stmts };

/**
 * Given an arbitrary number of lists of nodes, interleave them, starting with the first item of the first list.
 * Continue filling the combined list with available items from each list until all lists are empty.
 */
function interleave(...lists) {
    const combined = [];
    const max = Math.max(...lists.map(l => l.length));
    for (let i = 0; i < max; ++i) {
        for (const list of lists) if (list[i]) combined.push(list[i]);
    }
    return combined;
}

export default class Parser {
    /**
     * Top-level function.
     * Given some source code string, parse it and return a syntax tree.
     */
    parse(source) {
        // This is a triple-wrapped iterator:
        // 1. the tokenizer yields tokens one at a time
        // 2. the lookahead iterator allows us to peek at succeeding tokens without consuming them
        // 3. the new line check iterator filters new lines and adds a new line flag to each token preceding a new line
        this.tokenizer = new NewLineCheckIterator(new LookaheadIterator(new Tokenizer(source)));
        return this.acceptProgram();
    }

    // COMMON UTIL FUNCTIONS

    /**
     * Using the next token as a starting point, use the 'parseFunc' to attempt to parse a tree node
     * from the input. Throw 'message' if the parse fails.
     */
    parseNextToken(parseFunc, message) {
        const token = this.tokenizer.next().value;
        const parsed = parseFunc(token);
        if (!parsed && message) throw new ParserError(message, token.line, token.column);
        return parsed;
    }

    /**
     * Get the next token, expecting it to be of type 'type',
     * throwing an error with message 'message' if it is not.
     */
    expectNextToken(type, message) {
        const token = this.tokenizer.next().value;
        this.enforceTokenType(token, type, message);
        return token.type === type ? token : false;
    }

    /**
     * Check if the token is of the specified type,
     * throwing an error with the specified message if it is not.
     */
    enforceTokenType(token, type, message) {
        if (token.type !== type && message) {
            const formatted = (typeof message === 'function') ? message(token) : message;
            throw new ParserError(formatted, token.line, token.column);
        }
    }

    /**
     * Check if the token has a new line after it,
     * throwing an error with the specified message if it is not.
     */
    enforceNewLine(token, message) {
        if (!token.hasNewLine) throw new ParserError(message, token.line, token.column + token.image.length - 1);
    }

    // PARSER FUNCTIONS

    /**
     * Top-level AST node.
     *
     * Program ::= ImportDeclaration* (FunctionDeclaration | TypeDeclaration | ExportDeclaration)* EOF
     */
    acceptProgram() {
        const imports = [], functions = [], types = [], exports = [], children = [];
        for (const c of this.tokenizer) {
            let node;
            if (node = this.acceptImportDeclaration(c)) {
                if (functions.length || types.length || exports.length) throw new ParserError(mess.IMPORT_AFTER_DECL, c.line, c.column);
                imports.push(node);
                children.push(node);
            } else if (node = this.acceptFunctionDeclaration(c)) {
                functions.push(node);
                children.push(node);
            } else if (node = this.acceptTypeDeclaration(c)) {
                types.push(node);
                children.push(node);
            } else if (node = this.acceptExportDeclaration(c)) {
                exports.push(node);
                children.push(node);
            } else if (c.type === 'EOF') {
                children.push(c);
                if (children.length === 1) throw new ParserError(mess.EMPTY_FILE, 1, 1);
                return new AST.Program({ imports, functions, types, exports }, children);
            } else {
                throw new ParserError(mess.INVALID_PROGRAM(c), c.line, c.column);
            }
        }
        throw new Error('Tokenizer had no elements');
    }

    /**
     * ImportDeclaration ::= IMPORT FROM STRING_LITERAL COLON IDENT
     *                       IMPORT FROM STRING_LITERAL LBRACE ImportComponent (COMMA ImportComponent)* RBRACE
     */
    acceptImportDeclaration(tok) {
        if (tok.type !== 'IMPORT') return false;
        const fromToken = this.expectNextToken('FROM', mess.INVALID_IMPORT);
        const moduleNameToken = this.expectNextToken('STRING_LITERAL', mess.INVALID_IMPORT_MODULE);

        const next = this.tokenizer.next().value;
        if (next.type === 'COLON') {
            // default import
            const defaultImportNameToken = this.expectNextToken('IDENT', mess.INVALID_IMPORT);
            this.enforceNewLine(defaultImportNameToken, mess.IMPORT_NO_NEW_LINE);
            return new AST.ImportDeclaration({
                importToken: tok,
                fromToken,
                moduleNameToken,
                colonToken: next,
                defaultImportNameToken,
                defaultImport: true,
            }, [tok, fromToken, moduleNameToken, next, defaultImportNameToken]);
        } else if (next.type === 'LBRACE') {
            // named imports
            const importComponents = [], commaTokens = [];
            importComponents.push(this.parseNextToken(t => this.acceptImportComponent(t), mess.INVALID_IMPORT));
            let namedImportCloseBraceToken = this.tokenizer.next().value;
            while (namedImportCloseBraceToken.type === 'COMMA') {
                commaTokens.push(namedImportCloseBraceToken);
                importComponents.push(this.parseNextToken(t => this.acceptImportComponent(t), mess.INVALID_IMPORT));
                namedImportCloseBraceToken = this.tokenizer.next().value;
            }
            this.enforceTokenType(namedImportCloseBraceToken, 'RBRACE', mess.INVALID_IMPORT);
            this.enforceNewLine(namedImportCloseBraceToken, mess.IMPORT_NO_NEW_LINE);
            return new AST.ImportDeclaration({
                importToken: tok,
                fromToken,
                moduleNameToken,
                namedImportOpenBraceToken: next,
                importComponents,
                commaTokens,
                namedImportCloseBraceToken,
                defaultImport: false,
            }, [tok, fromToken, moduleNameToken, next, ...interleave(importComponents, commaTokens), namedImportCloseBraceToken]);
        } else {
            throw new ParserError(mess.INVALID_IMPORT, next.line, next.column);
        }
    }

    /**
     * ImportComponent ::= IDENT
     *                     IDENT AS IDENT
     */
    acceptImportComponent(tok) {
        if (tok.type !== 'IDENT') return false;
        if (this.tokenizer.peek().type === 'AS') {
            const asToken = this.tokenizer.next().value;
            const importAliasToken = this.expectNextToken('IDENT', mess.INVALID_IMPORT);
            return new AST.ImportComponent({
                importNameToken: tok,
                asToken,
                importAliasToken,
            }, [tok, asToken, importAliasToken]);
        } else {
            return new AST.ImportComponent({
                importNameToken: tok,
            }, [tok]);
        }
    }

    /**
     * FunctionDeclaration ::= FUNC Type IDENT ParameterList FAT_ARROW (Expression | Block)
     */
    acceptFunctionDeclaration(tok) {
        if (tok.type !== 'FUNC') return false;
        const returnType = this.parseNextToken(t => this.acceptType(t), mess.INVALID_RETURN_TYPE);
        const functionNameToken = this.expectNextToken('IDENT', mess.INVALID_FUNCTION_NAME);
        const params = this.parseNextToken(t => this.acceptParameterList(t), mess.INVALID_PARAMETER_LIST);
        const fatArrowToken = this.expectNextToken('FAT_ARROW', mess.INVALID_FAT_ARROW);
        const next = this.tokenizer.next().value;
        const functionBody = this.acceptFunctionBody(next);
        return new AST.FunctionDeclaration({
            funcToken: tok,
            returnType,
            functionNameToken,
            params,
            fatArrowToken,
            functionBody,
        }, [tok, returnType, functionNameToken, params, fatArrowToken, functionBody]);
    }

    /**
     * This is NOT a normal parser function.
     * There is ambiguity between blocks and struct literals, but only for function bodies.
     * So when we hit a function body, if there is an open brace, we accept a statement.
     * Otherwise, we always want an expression before a statement.
     */
    acceptFunctionBody(tok) {
        if (tok.type === 'LBRACE') {
            return this.acceptStatement(tok);
        } else {
            let body = this.acceptExpression(tok);
            if (!body) body = this.acceptStatement(tok);
            if (!body) throw new ParserError(mess.INVALID_FUNCTION_BODY, tok.line, tok.column);
            return body;
        }
    }

    /**
     * TypeDeclaration ::= TYPE IDENT EQUALS Type
     */
    acceptTypeDeclaration(tok) {
        if (tok.type !== 'TYPE') return false;
        const typeNameToken = this.expectNextToken('IDENT', mess.INVALID_TYPE_NAME);
        const equalsToken = this.expectNextToken('EQUALS', mess.TYPE_DECL_MISSING_EQUALS);
        const type = this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE);
        return new AST.TypeDeclaration({
            typeToken: tok,
            typeNameToken,
            equalsToken,
            type,
        }, [tok, typeNameToken, equalsToken, type]);
    }

    /**
     * ExportDeclaration ::= EXPORT DEFAULT Expression      -- default export
     *                     | EXPORT IDENT EQUALS Expression -- named inline export
     *                     | EXPORT IDENT EQUALS Type       -- named inline export
     *                     | EXPORT IDENT                   -- named export of already declared name
     */
    acceptExportDeclaration(tok) {
        if (tok.type !== 'EXPORT') return false;
        let next = this.tokenizer.next().value;
        if (next.type === 'DEFAULT') {
            const defaultToken = next;
            let exportedValue;
            next = this.tokenizer.next().value;
            if ((exportedValue = this.acceptFunctionDeclaration(next))
                    || (exportedValue = this.acceptTypeDeclaration(next))
                    || (exportedValue = this.acceptExpression(next))) {
                return new AST.ExportDeclaration({
                    exportToken: tok,
                    defaultToken,
                    exportedValue,
                }, [tok, defaultToken, exportedValue]);
            } else {
                throw new ParserError(mess.INVALID_DEFAULT_EXPORT_VALUE, next.line, next.column);
            }
        }
        if (next.type === 'IDENT') {
            const exportName = next;
            next = this.tokenizer.peek();
            if (next.type === 'EQUALS') {
                const equalsToken = this.tokenizer.next().value;
                let exportedValue;
                next = this.tokenizer.next().value;
                if ((exportedValue = this.acceptFunctionDeclaration(next))
                    || (exportedValue = this.acceptTypeDeclaration(next))
                    || (exportedValue = this.acceptExpression(next))) {
                    return new AST.ExportDeclaration({
                        exportToken: tok,
                        exportName,
                        equalsToken,
                        exportedValue,
                    }, [tok, exportName, equalsToken, exportedValue]);
                } else {
                    throw new ParserError(mess.INVALID_NAMED_EXPORT_VALUE, next.line, next.column);
                }
            } else {
                this.enforceNewLine(exportName, mess.EXPORT_NO_NEW_LINE);
                return new AST.ExportDeclaration({
                    exportToken: tok,
                    exportName,
                }, [tok, exportName]);
            }
        }
        throw new ParserError(mess.INVALID_EXPORT_DECLARATION, next.line, next.column);
    }

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
     *          (Type LBRACK RBRACK) | # Array types
     *          StructType |           # Structured type
     *          TupleType |            # Tuple type
     *          FunctionType |         # Function type
     *          (LPAREN Type RPAREN) | # Explicitly bounded type
     *          IDENT                  # Already defined type
     */
    acceptType(tok) {
        let typeNode;
        // handle single-token types
        switch (tok.type) {
            case 'U8': case 'I8': case 'BYTE':
            case 'U16': case 'I16': case 'SHORT':
            case 'U32': case 'I32': case 'INTEGER':
            case 'U64': case 'I64': case 'LONG':
            case 'INT':
            case 'F32': case 'FLOAT':
            case 'F64': case 'DOUBLE':
            case 'STRING':
            case 'CHAR':
            case 'BOOL':
            case 'VOID':
            case 'ANY':
                typeNode = new AST.Type({ builtIn: tok }, [tok]);
                break;
            case 'IDENT': typeNode = new AST.Type({ name: tok }, [tok]); break;
            default: break;
        }
        if (!typeNode) {
            // handle more complex types
            let type;
            if (type = this.acceptStructType(tok)) typeNode = new AST.Type({ structType: type }, [type]);
            else if (type = this.acceptFunctionOrTupleType(tok)) {
                if (type instanceof AST.FunctionType) typeNode = new AST.Type({ functionType: type }, [type]);
                else if (type instanceof AST.TupleType) typeNode = new AST.Type({ tupleType: type }, [type]);
                else typeNode = type; // the case of a single type in parentheses just returns a type
            } else return false;
        }
        // handle left recursion, types that start with an inner type
        while (this.tokenizer.peek()) {
            let outer;
            if (outer = this.tryArrayType(typeNode)) {
                typeNode = new AST.Type({ arrayType: outer }, [outer]);
            } else if (outer = this.tryUnionType(typeNode)) {
                typeNode = new AST.Type({ unionType: outer }, [outer]);
            } else {
                break;
            }
        }
        return typeNode;
    }

    tryArrayType(baseType) {
        const [peek1, peek2] = this.tokenizer.peek(0, 2);
        if (peek1.type !== 'LBRACK' || peek2.type !== 'RBRACK') return false;
        const [arrayLeftBracketToken, arrayRightBracketToken] = [this.tokenizer.next().value, this.tokenizer.next().value];
        return new AST.ArrayType({
            baseType,
            arrayLeftBracketToken,
            arrayRightBracketToken,
        }, [baseType, arrayLeftBracketToken, arrayRightBracketToken]);
    }

    tryUnionType(left) {
        if (this.tokenizer.peek().image !== '|') return false;
        const vbarToken = this.tokenizer.next().value;
        const right = this.parseNextToken(t => this.acceptType(t), mess.INVALID_UNION_TYPE);
        return new AST.UnionType({
            left,
            vbarToken,
            right,
        }, [left, vbarToken, right]);
    }

    /**
     * ParameterList ::= LPAREN (Param (COMMA Param)*)? RPAREN
     */
    acceptParameterList(tok) {
        if (tok.type !== 'LPAREN') return false;
        let peek = this.tokenizer.peek();
        const params = [], commaTokens = [];
        if (peek.type !== 'RPAREN') {
            // try to parse a parameter
            params.push(this.parseNextToken(t => this.acceptParam(t)));
            while ((peek = this.tokenizer.peek()).type === 'COMMA') {
                commaTokens.push(this.tokenizer.next().value);
                params.push(this.parseNextToken(t => this.acceptParam(t)));
            }
        }
        // close param list
        const closeParenToken = this.expectNextToken('RPAREN', mess.MISSING_CLOSE_PAREN);
        return new AST.ParameterList({
            openParenToken: tok,
            params,
            commaTokens,
            closeParenToken,
        }, [tok, ...interleave(params, commaTokens), closeParenToken]);
    }

    /**
     * Param ::= Type IDENT
     */
    acceptParam(tok) {
        const type = this.acceptType(tok);
        if (!type) throw new ParserError(mess.INVALID_PARAMETER_TYPE, tok.line, tok.column);
        const identifierToken = this.expectNextToken('IDENT', mess.INVALID_PARAMETER_NAME);
        return new AST.Param({
            type,
            identifierToken,
        }, [type, identifierToken]);
    }

    /**
     * Expression ::= INTEGER_LITERAL |
     *                FLOAT_LITERAL |
     *                STRING_LITERAL |
     *                CHARACTER_LITERAL |
     *                IDENT |
     *                ArrayLiteral |
     *                StructLiteral |
     *                TupleLiteral |
     *                FunctionApplication |
     *                UnaryOperation |
     *                BinaryOperation |
     *                VarDeclaration |
     *                FieldAccess |
     *                ArrayAccess |
     *                LambdaExpression |
     *                IfElseExpression |
     *                LPAREN Expression RPAREN
     */
    acceptExpression(tok) {
        let exp;
        let inner;
        // handle non-left-recursive and non-paren first
        // simple 1 token expressions
        switch (tok.type) {
            case 'INTEGER_LITERAL': exp = new AST.Expression({ integerLiteralToken: tok }, [tok]); break;
            case 'FLOAT_LITERAL': exp = new AST.Expression({ floatLiteralToken: tok }, [tok]); break;
            case 'STRING_LITERAL': exp = new AST.Expression({ stringLiteralToken: tok }, [tok]); break;
            case 'CHARACTER_LITERAL': exp = new AST.Expression({ characterLiteralToken: tok }, [tok]); break;
            case 'TRUE': case 'FALSE': exp = new AST.Expression({ boolLiteralToken: tok }, [tok]); break;
            case 'IDENT': {
                if (inner = this.acceptVarDeclaration(tok)) {
                    exp = new AST.Expression({ varDecl: inner }, [inner]);
                } else if (inner = this.acceptLambdaExpressionOrTupleLiteral(tok)) {
                    exp = new AST.Expression({ lambda: inner }, [inner]);
                } else {
                    exp = new AST.Expression({ identToken: tok }, [tok]);
                }
                break;
            }
            default: break;
        }
        if (!exp) {
            // other literals/expressions
            if (inner = this.acceptArrayLiteral(tok)) {
                exp = new AST.Expression({ arrayLiteral: inner }, [inner]);
            } else if (inner = this.acceptStructLiteral(tok)) {
                exp = new AST.Expression({ structLiteral: inner }, [inner]);
            } else if (inner = this.acceptIfElseExpression(tok)) {
                exp = new AST.Expression({ ifElse: inner }, [inner]);
            } else if (inner = this.acceptPrefixExpression(tok)) {
                exp = new AST.Expression({ unary: inner }, [inner]);
            } else if (tok.type === 'LPAREN') {
                // handle parentheses
                // the below function will never return false at this location, so there is no need to verify truthiness
                inner = this.acceptLambdaExpressionOrTupleLiteral(tok);
                if (inner instanceof AST.LambdaExpression) exp = new AST.Expression({ lambda: inner }, [inner]);
                else if (inner instanceof AST.TupleLiteral) exp = new AST.Expression({ tupleLiteral: inner }, [inner]);
                else exp = inner; // just a parenthetical expression
            }
            if (!exp) return false;
        }
        // handle left recursion, expressions that start with an inner expression
        while (this.tokenizer.peek()) {
            let outer;
            if (outer = this.tryFunctionApplication(exp)) {
                exp = new AST.Expression({ functionApplication: outer }, [outer]);
            } else if (outer = this.tryBinaryOrPostfixExpression(exp)) {
                if (outer instanceof AST.BinaryExpression) exp = new AST.Expression({ binary: outer }, [outer]);
                else exp = new AST.Expression({ unary: outer }, [outer]);
            } else if (outer = this.tryFieldAccess(exp)) {
                exp = new AST.Expression({ fieldAccess: outer }, [outer]);
            } else if (outer = this.tryArrayAccess(exp)) {
                exp = new AST.Expression({ arrayAccess: outer }, [outer]);
            } else {
                break;
            }
        }
        return exp;
    }

    /**
     * We need this function because return statements can optionally not include an expression, and the binary/postfix logic also needs to determine if there
     * is an expression without consuming tokens.
     * Effectively, a token can be the start of an expression iff it is a literal token, an identifier, the start of a structured literal, the start of an if
     * expression, or the start of one of the three wacky parenthesis expressions (tuples, lambdas, paren-expressions).
     */
    isStartOfExpression(tok) {
        return ['INTEGER_LITERAL', 'FLOAT_LITERAL', 'STRING_LITERAL', 'CHARACTER_LITERAL', 'IDENT', 'LBRACK', 'LBRACE', 'IF', 'OPER', 'LPAREN'].includes(tok.type);
    }

    /**
     * StructType ::= LBRACE (Type IDENT)* RBRACE
     */
    acceptStructType(tok) {
        if (tok.type !== 'LBRACE') return false;
        const fieldTypes = [], fieldNameTokens = [];
        while (this.tokenizer.peek().type !== 'RBRACE') {
            fieldTypes.push(this.parseNextToken(t => this.acceptType(t), mess.INVALID_FIELD_TYPE));
            const identToken = this.expectNextToken('IDENT', mess.INVALID_FIELD_NAME);
            this.enforceNewLine(identToken, mess.STRUCT_FIELD_NO_NEW_LINE);
            fieldNameTokens.push(identToken);
        }
        const closeBraceToken = this.tokenizer.next().value;
        return new AST.StructType({
            openBraceToken: tok,
            fieldTypes,
            fieldNameTokens,
            closeBraceToken,
        }, [tok, ...interleave(fieldTypes, fieldNameTokens), closeBraceToken]);
    }

    /**
     * FunctionType ::= LPAREN (Type (COMMA Type)*)? RPAREN FAT_ARROW Type
     * TupleType ::= LPAREN (Type (COMMA Type)*)? RPAREN
     */
    acceptFunctionOrTupleType(tok) {
        // function and tuple types are initially ambiguous, so they need a common parse function
        if (tok.type !== 'LPAREN') return false;
        const types = [], commaTokens = [];
        if (this.tokenizer.peek().type !== 'RPAREN') {
            types.push(this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE));
            while (this.tokenizer.peek().type !== 'RPAREN') {
                commaTokens.push(this.expectNextToken('COMMA', mess.FUNCTION_TYPE_MISSING_COMMA));
                types.push(this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE));
            }
        }
        const closeParenToken = this.tokenizer.next().value;
        if (this.tokenizer.peek().type !== 'FAT_ARROW') {
            // parse as tuple
            if (types.length === 1) {
                // if there is only one type, it's just a type, not a tuple type
                return new AST.Type({
                    openParenToken: tok,
                    innerType: types[0],
                    closeParenToken,
                }, [tok, types[0], closeParenToken]);
            }
            return new AST.TupleType({
                openParenToken: tok,
                types,
                commaTokens,
                closeParenToken,
            }, [tok, ...interleave(types, commaTokens), closeParenToken]);
        }
        // parse as function
        const fatArrowToken = this.expectNextToken('FAT_ARROW', mess.FUNCTION_TYPE_MISSING_FAT_ARROW);
        const returnType = this.parseNextToken(t => this.acceptType(t), mess.FUNCTION_TYPE_INVALID_RETURN_TYPE);
        return new AST.FunctionType({
            openParenToken: tok,
            paramTypes: types,
            commaTokens,
            closeParenToken,
            fatArrowToken,
            returnType,
        }, [tok, ...interleave(types, commaTokens), closeParenToken, fatArrowToken, returnType]);
    }

    /**
     * VarDeclaration ::= IDENT EQUALS Expression
     */
    acceptVarDeclaration(tok) {
        if (tok.type !== 'IDENT' || this.tokenizer.peek().type !== 'EQUALS') return false;
        const equalsToken = this.expectNextToken('EQUALS', mess.INVALID_VAR_DECLARATION);
        const initialValue = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_INITIAL_VALUE);
        return new AST.VarDeclaration({
            varIdentToken: tok,
            equalsToken,
            initialValue,
        }, [tok, equalsToken, initialValue]);
    }

    /**
     * LambdaExpression ::= LambdaParamList FAT_ARROW (Expression | Block)
     *
     * So this is interesting.
     * Take the following expressions:
     * - (a)             (parenthetical expression)
     * - (a, b)          (tuple literal)
     * - (a) => exp      (lambda)
     * - (a, b) => exp   (lambda)
     * How do we distinguish between 1 and 3, or 2 and 4?
     * Initially, tuples are more free than lambdas. They can contain any expression as opposed to just identifiers.
     * This means that we need to check for a tuple first, which coincidentally also checks for parenthetical expressions.
     * If that comes back as matched, and the next token is a fat arrow, one of four things could happen:
     * 1. It is a parenthetical expression whose inner expression is an identifier, in which case we parse as a lambda expression.
     * 2. It is any other parenthetical expression, in which case it is returned as an expression.
     * 3. It is a tuple where all contained expressions are identifiers, in which case we parse as a lambda expression.
     * 4. It is any other tuple, in which case it is returned as a tuple.
     * If it does not match either a tuple or an expression, then we proceed with the lambda parse starting with the param list.
     */
    acceptLambdaExpressionOrTupleLiteral(tok) {
        const tuple = this.acceptTupleLiteralOrLambdaParamList(tok);
        if (tuple instanceof AST.TupleLiteral || tuple instanceof AST.Expression) return tuple;
        const paramList = tuple;
        // acceptTupleLiteralOrLambdaParamList() will always return a valid node or throw an error, it will never be false
        // if there is only one parameter and it is non-parenthesized, it could still be something else
        if (paramList.children.length === 1 && this.tokenizer.peek().type !== 'FAT_ARROW') return false;
        const fatArrowToken = this.expectNextToken('FAT_ARROW', mess.INVALID_LAMBDA_EXPRESSION_MISSING_FAT_ARROW);
        const next = this.tokenizer.next().value;
        const body = this.acceptFunctionBody(next);
        return new AST.LambdaExpression({ paramList, fatArrowToken, body }, [paramList, fatArrowToken, body]);
    }

    /**
     * TupleLiteral ::= LPAREN RPAREN | LPAREN Expression (COMMA Expression)+ RPAREN
     * LambdaParamList ::= IDENT
     *                   | LPAREN RPAREN
     *                   | LPAREN LambdaParam (COMMA LambdaParam)* RPAREN
     */
    acceptTupleLiteralOrLambdaParamList(tok) {
        // single identifier is params list
        if (tok.type === 'IDENT') return new AST.LambdaParamList({ params: [tok] }, [tok]);
        // we used to check for an LPAREN, but because of the logic leading to here, it is impossible for this not to be an LPAREN at this point
        const items = [], commaTokens = [];
        let first = true;
        while (this.tokenizer.peek().type !== 'RPAREN') {
            if (first) first = false;
            else commaTokens.push(this.expectNextToken('COMMA', mess.TUPLE_LITERAL_MISSING_COMMA));
            // try to get a param
            const next = this.tokenizer.next().value;
            const param = this.acceptLambdaParam(next);
            if (param) {
                items.push(param);
            } else {
                const exp = this.acceptExpression(next);
                items.push(exp);
            }
        }
        const closeParenToken = this.tokenizer.next().value;
        /**
         * Determine what it is:
         * ? Next is FAT_ARROW
         * 1. list of all lambda params = LambdaParamList
         * 2. empty list = LambdaParamList
         * 3. everything else = ERROR
         * ? Next is not FAT_ARROW
         * 1. one expression = Expression
         * 2. list of all expressions = TupleLiteral
         * 3. empty list = TupleLiteral
         * 4. everything else = ERROR
         */
        const peek = this.tokenizer.peek();
        if (peek.type === 'FAT_ARROW') {
            // has to be a valid param list, otherwise it's an error
            if (items.every(i => i instanceof AST.LambdaParam)) {
                return new AST.LambdaParamList({
                    openParenToken: tok,
                    params: items,
                    commaTokens,
                    closeParenToken,
                }, [tok, ...interleave(items, commaTokens), closeParenToken]);
            } else {
                throw new ParserError(mess.INVALID_LAMBDA_PARAM, tok.line, tok.column);
            }
        } else {
            if (items.length === 1 && items[0] instanceof AST.Expression) {
                return new AST.Expression({
                    openParenToken: tok,
                    innerExpression: items[0],
                    closeParenToken,
                }, [tok, items[0], closeParenToken]);
            } else if (items.length === 0 || items.every(i => i instanceof AST.Expression)) {
                return new AST.TupleLiteral({
                    openParenToken: tok,
                    items,
                    commaTokens,
                    closeParenToken,
                }, [tok, ...interleave(items, commaTokens), closeParenToken]);
            } else {
                throw new ParserError(mess.INVALID_EXPRESSION, tok.line, tok.column);
            }
        }
    }

    /**
     * LambdaParam ::= IDENT | (Type IDENT)
     */
    acceptLambdaParam(tok) {
        const type = this.acceptType(tok);
        if (!type) return false;
        if (type.name && this.tokenizer.peek().type !== 'IDENT') {
            // if the type is an identifier and an identifier does not follow it, then it is an implicit parameter
            return new AST.LambdaParam({ identifierToken: type.name }, [type.name]);
        }
        const identifierToken = this.tokenizer.next().value;
        return new AST.LambdaParam({ type, identifierToken }, [type, identifierToken]);
    }

    /**
     * ArrayLiteral ::= LBRACK (Expression (COMMA Expression)*)? RBRACK
     */
    acceptArrayLiteral(tok) {
        if (tok.type !== 'LBRACK') return false;
        const items = [], commaTokens = [];
        let first = true;
        while (this.tokenizer.peek().type !== 'RBRACK') {
            if (first) first = false;
            else commaTokens.push(this.expectNextToken('COMMA', mess.ARRAY_LITERAL_MISSING_COMMA));
            items.push(this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION));
        }
        const closeBracketToken = this.tokenizer.next().value;
        return new AST.ArrayLiteral({
            openBracketToken: tok,
            items,
            commaTokens,
            closeBracketToken,
        }, [tok, ...interleave(items, commaTokens), closeBracketToken]);
    }

    /**
     * StructLiteral ::= LBRACE (IDENT COLON Expression (COMMA IDENT COLON Expression)*)? RBRACE
     */
    acceptStructLiteral(tok) {
        if (tok.type !== 'LBRACE') return false;
        const keyTokens = [], colonTokens = [], values = [], commaTokens = [];
        let first = true;
        while (this.tokenizer.peek().type !== 'RBRACE') {
            if (first) first = false;
            else commaTokens.push(this.expectNextToken('COMMA', mess.STRUCT_LITERAL_MISSING_COMMA));
            keyTokens.push(this.expectNextToken('IDENT', mess.STRUCT_LITERAL_MISSING_KEY));
            colonTokens.push(this.expectNextToken('COLON', mess.STRUCT_LITERAL_MISSING_COLON));
            values.push(this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION));
        }
        const closeBraceToken = this.tokenizer.next().value;
        return new AST.StructLiteral({
            openBraceToken: tok,
            keyTokens,
            colonTokens,
            values,
            commaTokens,
            closeBraceToken,
        }, [tok, ...interleave(keyTokens, colonTokens, values, commaTokens), closeBraceToken]);
    }

    /**
     * IfElseExpression :: IF LPAREN Expression RPAREN Expression ELSE Expression
     */
    acceptIfElseExpression(tok) {
        if (tok.type !== 'IF') return false;
        const openParenToken = this.expectNextToken('LPAREN', mess.IF_MISSING_OPEN_PAREN);
        const condition = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
        const closeParenToken = this.expectNextToken('RPAREN', mess.IF_MISSING_CLOSE_PAREN);
        const consequent = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
        const elseToken = this.expectNextToken('ELSE', mess.IF_MISSING_ELSE);
        const alternate = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
        return new AST.IfElseExpression({
            ifToken: tok,
            openParenToken,
            condition,
            closeParenToken,
            consequent,
            elseToken,
            alternate,
        }, [tok, openParenToken, condition, closeParenToken, consequent, elseToken, alternate]);
    }

    /**
     * PrefixExpression ::= OPER Expression
     */
    acceptPrefixExpression(tok) {
        if (tok.type !== 'OPER') return false;
        const target = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
        return new AST.UnaryExpression({
            prefix: true,
            operatorToken: tok,
            target,
        }, [tok, target]);
    }

    /**
     * FunctionApplication ::= Expression LPAREN (Expression (COMMA Expression)*)? RPAREN
     */
    tryFunctionApplication(target) {
        if (this.tokenizer.peek().type !== 'LPAREN') return false;
        const openParenToken = this.tokenizer.next().value;
        const paramValues = [], commaTokens = [];
        let first = true;
        while (this.tokenizer.peek().type !== 'RPAREN') {
            if (first) first = false;
            else commaTokens.push(this.expectNextToken('COMMA', mess.FUNCTION_APPLICATION_MISSING_COMMA));
            paramValues.push(this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION));
        }
        const closeParenToken = this.tokenizer.next().value;
        return new AST.FunctionApplication({
            target,
            openParenToken,
            paramValues,
            commaTokens,
            closeParenToken,
        }, [target, openParenToken, ...interleave(paramValues, commaTokens), closeParenToken]);
    }

    /**
     * BinaryExpression ::= Expression OPER Expression
     * PostfixExpression ::= Expression OPER
     */
    tryBinaryOrPostfixExpression(left) {
        const operatorToken = this.tokenizer.peek();
        if (operatorToken.type !== 'OPER') return false;
        this.tokenizer.next();
        if (this.isStartOfExpression(this.tokenizer.peek())) {
            const right = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
            return new AST.BinaryExpression({
                left,
                operatorToken,
                right,
            }, [left, operatorToken, right]);
        }
        return new AST.UnaryExpression({
            prefix: false,
            operatorToken,
            target: left,
        }, [left, operatorToken]);
    }

    /**
     * FieldAccess ::= Expression DOT IDENT
     */
    tryFieldAccess(target) {
        if (this.tokenizer.peek().type !== 'DOT') return false;
        const dotToken = this.tokenizer.next().value;
        const fieldIdentToken = this.expectNextToken('IDENT', mess.FIELD_ACCESS_INVALID_FIELD_NAME);
        return new AST.FieldAccess({
            target,
            dotToken,
            fieldIdentToken,
        }, [target, dotToken, fieldIdentToken]);
    }

    /**
     * ArrayAccess ::= Expression LBRACK Expression RBRACK
     */
    tryArrayAccess(target) {
        if (this.tokenizer.peek().type !== 'LBRACK') return false;
        const openBracketToken = this.tokenizer.next().value;
        const indexExp = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
        const closeBracketToken = this.expectNextToken('RBRACK', mess.ARRAY_ACCESS_MISSING_CLOSE_BRACKET);
        return new AST.ArrayAccess({ target, openBracketToken, indexExp, closeBracketToken }, [target, openBracketToken, indexExp, closeBracketToken]);
    }

    /**
     * Statement ::= Block
     *               Expression |
     *               ForStatement |
     *               WhileStatement |
     *               DoWhileStatement |
     *               TryCatchStatement |
     *               ReturnStatement |
     *               ThrowStatement |
     *               BreakStatement
     */
    acceptStatement(tok) {
        let inner;
        if (inner = this.acceptBlock(tok)) {
            return new AST.Statement({ block: inner }, [inner]);
        } else if (inner = this.acceptExpression(tok)) {
            return new AST.Statement({ exp: inner }, [inner]);
        } else if (inner = this.acceptForStatement(tok)) {
            return new AST.Statement({ for: inner }, [inner]);
        } else if (inner = this.acceptWhileStatement(tok)) {
            return new AST.Statement({ while: inner }, [inner]);
        } else if (inner = this.acceptDoWhileStatement(tok)) {
            return new AST.Statement({ doWhile: inner }, [inner]);
        } else if (inner = this.acceptTryCatchStatement(tok)) {
            return new AST.Statement({ tryCatch: inner }, [inner]);
        } else if (inner = this.acceptThrowStatement(tok)) {
            return new AST.Statement({ throw: inner }, [inner]);
        } else if (inner = this.acceptReturnStatement(tok)) {
            return new AST.Statement({ return: inner }, [inner]);
        } else if (inner = this.acceptBreakStatement(tok)) {
            return new AST.Statement({ break: inner }, [inner]);
        } else if (inner = this.acceptContinueStatement(tok)) {
            return new AST.Statement({ continue: inner }, [inner]);
        } else {
            return false;
        }
    }

    /**
     * Block ::= LBRACE Statement* RBRACE
     */
    acceptBlock(tok) {
        if (tok.type !== 'LBRACE') return false;
        const statements = [];
        let next = this.tokenizer.next().value;
        while (true) {
            const statement = this.acceptStatement(next);
            if (statement) statements.push(statement);
            else break;
            next = this.tokenizer.next().value;
        }
        this.enforceTokenType(next, 'RBRACE', mess.MISSING_CLOSE_BRACE);
        return new AST.Block({
            openBraceToken: tok,
            statements,
            closeBraceToken: next,
        }, [tok, ...statements, next]);
    }

    /**
     * ForStatement ::= FOR LPAREN IDENT IN Expression RPAREN Block
     */
    acceptForStatement(tok) {
        if (tok.type !== 'FOR') return false;
        const openParenToken = this.expectNextToken('LPAREN', mess.FOR_MISSING_OPEN_PAREN);
        const iterVarToken = this.expectNextToken('IDENT', mess.FOR_INVALID_ITER_IDENT);
        const inToken = this.expectNextToken('IN', mess.FOR_MISSING_IN);
        const iterableExp = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
        const closeParenToken = this.expectNextToken('RPAREN', mess.FOR_MISSING_CLOSE_PAREN);
        const body = this.parseNextToken(t => this.acceptStatement(t), mess.INVALID_STATEMENT);
        return new AST.ForStatement({
            forToken: tok,
            openParenToken,
            iterVarToken,
            inToken,
            iterableExp,
            closeParenToken,
            body,
        }, [tok, openParenToken, iterVarToken, inToken, iterableExp, closeParenToken, body]);
    }

    /**
     * WhileStatement ::= WHILE LPAREN Expression RPAREN Block
     */
    acceptWhileStatement(tok) {
        if (tok.type !== 'WHILE') return false;
        const openParenToken = this.expectNextToken('LPAREN', mess.WHILE_MISSING_OPEN_PAREN);
        const conditionExp = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
        const closeParenToken = this.expectNextToken('RPAREN', mess.WHILE_MISSING_CLOSE_PAREN);
        const body = this.parseNextToken(t => this.acceptStatement(t), mess.INVALID_STATEMENT);
        return new AST.WhileStatement({
            whileToken: tok,
            openParenToken,
            conditionExp,
            closeParenToken,
            body,
        }, [tok, openParenToken, conditionExp, closeParenToken, body]);
    }

    /**
     * DoWhileStatement ::= DO Block WHILE LPAREN Expression RPAREN
     */
    acceptDoWhileStatement(tok) {
        if (tok.type !== 'DO') return false;
        const body = this.parseNextToken(t => this.acceptStatement(t), mess.INVALID_STATEMENT);
        const whileToken = this.expectNextToken('WHILE', mess.DO_WHILE_MISSING_WHILE);
        const openParenToken = this.expectNextToken('LPAREN', mess.WHILE_MISSING_OPEN_PAREN);
        const conditionExp = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
        const closeParenToken = this.expectNextToken('RPAREN', mess.WHILE_MISSING_CLOSE_PAREN);
        return new AST.DoWhileStatement({
            doToken: tok,
            body,
            whileToken,
            openParenToken,
            conditionExp,
            closeParenToken,
        }, [tok, body, whileToken, openParenToken, conditionExp, closeParenToken]);
    }

    /**
     * TryCatchStatement ::= TRY Block (CATCH LPAREN Param RPAREN Block)+ (FINALLY Block)?
     */
    acceptTryCatchStatement(tok) {
        if (tok.type !== 'TRY') return false;
        const tryBody = this.parseNextToken(t => this.acceptStatement(t), mess.INVALID_STATEMENT);
        // at least one catch block
        const catchTokens = [this.expectNextToken('CATCH', mess.TRY_CATCH_MISSING_CATCH)];
        const openParenTokens = [this.expectNextToken('LPAREN', mess.CATCH_MISSING_OPEN_PAREN)];
        const catchParams = [this.parseNextToken(t => this.acceptParam(t), mess.CATCH_INVALID_PARAM)];
        const closeParenTokens = [this.expectNextToken('RPAREN', mess.CATCH_MISSING_CLOSE_PAREN)];
        const catchBlocks = [this.parseNextToken(t => this.acceptStatement(t), mess.INVALID_STATEMENT)];
        // potentially more
        while (this.tokenizer.peek().type === 'CATCH') {
            catchTokens.push(this.tokenizer.next().value);
            openParenTokens.push(this.expectNextToken('LPAREN', mess.CATCH_MISSING_OPEN_PAREN));
            catchParams.push(this.parseNextToken(t => this.acceptParam(t), mess.CATCH_INVALID_PARAM));
            closeParenTokens.push(this.expectNextToken('RPAREN', mess.CATCH_MISSING_CLOSE_PAREN));
            catchBlocks.push(this.parseNextToken(t => this.acceptStatement(t), mess.INVALID_STATEMENT));
        }
        // potential finally
        if (this.tokenizer.peek().type === 'FINALLY') {
            const finallyToken = this.tokenizer.next().value;
            const finallyBlock = this.parseNextToken(t => this.acceptStatement(t), mess.INVALID_STATEMENT);
            return new AST.TryCatchStatement({ tryToken: tok, tryBody, catchTokens, openParenTokens, catchParams, closeParenTokens, catchBlocks, finallyToken, finallyBlock },
                [tok, tryBody, ...interleave(catchTokens, openParenTokens, catchParams, closeParenTokens, catchBlocks), finallyToken, finallyBlock]);
        }
        return new AST.TryCatchStatement({ tryToken: tok, tryBody, catchTokens, openParenTokens, catchParams, closeParenTokens, catchBlocks },
            [tok, tryBody, ...interleave(catchTokens, openParenTokens, catchParams, closeParenTokens, catchBlocks)]);
    }

    /**
     * ThrowStatement ::= THROW Expression
     */
    acceptThrowStatement(tok) {
        if (tok.type !== 'THROW') return false;
        const exp = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
        return new AST.ThrowStatement({
            throwToken: tok,
            exp,
        }, [tok, exp]);
    }

    /**
     * ReturnStatement ::= RETURN Expression?
     */
    acceptReturnStatement(tok) {
        if (tok.type !== 'RETURN') return false;
        if (this.isStartOfExpression(this.tokenizer.peek())) {
            const exp = this.parseNextToken(t => this.acceptExpression(t), mess.INVALID_EXPRESSION);
            return new AST.ReturnStatement({ returnToken: tok, exp }, [tok, exp]);
        }
        return new AST.ReturnStatement({ returnToken: tok }, [tok]);
    }

    /**
     * BreakStatement ::= BREAK INTEGER_LITERAL?
     */
    acceptBreakStatement(tok) {
        if (tok.type !== 'BREAK') return false;
        const loopNumber = this.tokenizer.peek().type === 'INTEGER_LITERAL' && this.tokenizer.next().value;
        if (!loopNumber) return new AST.BreakStatement({ breakToken: tok }, [tok]);
        return new AST.BreakStatement({ breakToken: tok, loopNumber }, [tok, loopNumber]);
    }

    /**
     * ContinueStatement ::= CONTINUE INTEGER_LITERAL?
     */
    acceptContinueStatement(tok) {
        if (tok.type !== 'CONTINUE') return false;
        const loopNumber = this.tokenizer.peek().type === 'INTEGER_LITERAL' && this.tokenizer.next().value;
        if (!loopNumber) return new AST.ContinueStatement({ continueToken: tok }, [tok]);
        return new AST.ContinueStatement({ continueToken: tok, loopNumber }, [tok, loopNumber]);
    }
}
