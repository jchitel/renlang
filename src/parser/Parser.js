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

/**
 * The parser logic is tightly coupled to the comments above each accept*() method.
 * The comments specify expansion rules for their corresponding non-terminal.
 * They have rules based on the parser logic:
 * - A non-terminal must either have a sequential expansion, a choice expansion, or a left-recursive expansion
 * - Sequential expansions are space-separated lists of components, signifying that the non-terminal must expand to that sequence.
 * - A component is a terminal (token) or non-terminal, and can have the following modifiers:
 *   - optional (?)
 *   - oneOrMore (+)
 *   - zeroOrMore (*)
 *   - alternate ((* alt <comp>) or (+ alt <comp>))
 * - The "alternate" modifier specifies either oneOrMore or zeroOrMore, with the extra stipulation that repetitions should be separated by some other component.
 *   This is an abstraction of a very commonly occuring structure.
 * - Choice expansions are bar-separated (|) lists of components, signifying that the non-terminal can expand to any one of the choices.
 * - Components in choice expansions cannot have modifiers.
 * - Left-recursive expansions are an extension of choice expansions that allow for left-recursive choices.
 * - These are the rules of left-recursive expansions:
 *   - There must be at least one non-left-recursive choice
 *   - Left-recursive choices are grouped under a *Suffix non-terminal
 *   - The *Suffix non-terminal must come last in the choice list (as "N NSuffix")
 *   - The *Suffix non-terminal must be a choice expansion of components labelled *Suffix as well (to indicate that they only represent the tail of the whole expansion)
 * - No other syntax is allowed. Expansions cannot be nested (aside from the stipulation for left-recursion above), and must be split out into separate non-terminals.
 * - Any parse logic should be possible with this syntax.
 */
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

    expectNextTokenImage(image, message) {
        const token = this.tokenizer.next().value;
        if (token.image !== image && message) {
            const formatted = (typeof message === 'function') ? message(token) : message;
            throw new ParserError(formatted, token.line, token.column);
        }
        return token.image === image ? token : false;
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
        let typeParamList;
        if (this.tokenizer.peek().image === '<') typeParamList = this.acceptTypeParamList(this.tokenizer.next().value);
        const params = this.parseNextToken(t => this.acceptParameterList(t), mess.INVALID_PARAMETER_LIST);
        const fatArrowToken = this.expectNextToken('FAT_ARROW', mess.INVALID_FAT_ARROW);
        const next = this.tokenizer.next().value;
        const functionBody = this.acceptFunctionBody(next);
        return new AST.FunctionDeclaration({
            funcToken: tok,
            returnType,
            functionNameToken,
            typeParamList,
            params,
            fatArrowToken,
            functionBody,
        }, [tok, returnType, functionNameToken, typeParamList, params, fatArrowToken, functionBody]);
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
        let typeParamList;
        if (this.tokenizer.peek().image === '<') typeParamList = this.acceptTypeParamList(this.tokenizer.next().value);
        const equalsToken = this.expectNextToken('EQUALS', mess.TYPE_DECL_MISSING_EQUALS);
        const type = this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE);
        return new AST.TypeDeclaration({
            typeToken: tok,
            typeNameToken,
            typeParamList,
            equalsToken,
            type,
        }, [tok, typeNameToken, typeParamList, equalsToken, type]);
    }

    /**
     * TypeParamList ::= LT TypeParam (COMMA TypeParam)* GT
     */
    acceptTypeParamList(tok) {
        const typeParams = [];
        const commas = [];
        typeParams.push(this.parseNextToken(t => this.acceptTypeParam(t), mess.INVALID_TYPE_PARAM));
        while (this.tokenizer.peek().type === 'COMMA') {
            commas.push(this.tokenizer.next().value);
            typeParams.push(this.parseNextToken(t => this.acceptTypeParam(t), mess.INVALID_TYPE_PARAM));
        }
        const closeGtToken = this.expectNextTokenImage('>', mess.INVALID_TYPE_PARAM_LIST);
        return new AST.TypeParamList({
            openLtToken: tok,
            typeParams,
            commas,
            closeGtToken,
        }, [tok, ...interleave(typeParams, commas), closeGtToken]);
    }

    /**
     * TypeParam ::= (+ | -)? IDENT ((COLON | ASS_FROM) Type)?
     */
    acceptTypeParam(tok) {
        const components = [];
        let varianceOpToken;
        if (tok.image === '+' || tok.image === '-') {
            varianceOpToken = tok;
            components.push(varianceOpToken);
            tok = this.tokenizer.next().value;
        }
        components.push(tok);
        this.enforceTokenType(tok, 'IDENT', mess.INVALID_TYPE_PARAM);
        let constraintOpToken, constraintType;
        if (this.tokenizer.peek().type === 'COLON' || this.tokenizer.peek().type === 'ASS_FROM') {
            constraintOpToken = this.tokenizer.next().value;
            constraintType = this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE_PARAM);
            components.push(constraintOpToken);
            components.push(constraintType);
        }
        return new AST.TypeParam({
            varianceOpToken,
            identToken: tok,
            constraintOpToken,
            constraintType,
        });
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
            default: break;
        }
        if (tok.type === 'IDENT') {
            typeNode = new AST.Type({ name: tok }, [tok]);
            if (this.tokenizer.peek().image === '<') {
                const typeArgList = this.parseNextToken(t => this.acceptTypeArgList(t), mess.INVALID_TYPE_ARG_LIST);
                typeNode = new AST.GenericType({ baseType: typeNode, typeArgList });
            }
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

    /**
     * TypeArgList ::= LT Type (COMMA Type)* GT
     */
    acceptTypeArgList(tok) {
        const types = [];
        const commas = [];
        types.push(this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE_ARGUMENT));
        while (this.tokenizer.peek().type === 'COMMA') {
            commas.push(this.tokenizer.next().value);
            types.push(this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE_ARGUMENT));
        }
        const closeGtToken = this.expectNextTokenImage('>', mess.INVALID_TYPE_ARG_LIST);
        return new AST.TypeArgList({
            openLtToken: tok,
            types,
            commas,
            closeGtToken,
        }, [tok, ...interleave(types, commas), closeGtToken]);
    }

    tryArrayType(baseType) {
        const [peek1, peek2] = this.tokenizer.peek(0, 2);
        if (peek1.type !== 'LBRACK' || peek2.type !== 'RBRACK') return false;
        const [openBracketToken, closeBracketToken] = [this.tokenizer.next().value, this.tokenizer.next().value];
        return new AST.ArrayType({
            baseType,
            openBracketToken,
            closeBracketToken,
        }, [baseType, openBracketToken, closeBracketToken]);
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
        let typeArgList;
        if (this.tokenizer.peek().image === '<') {
            typeArgList = this.parseNextToken(t => this.acceptTypeArgList(t), mess.INVALID_TYPE_ARG_LIST);
        }
        if (this.tokenizer.peek().type !== 'LPAREN') {
            if (typeArgList) throw new ParserError(mess.INVALID_EXPRESSION, this.tokenizer.peek().line, this.tokenizer.peek().column);
            return false;
        }
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
            typeArgList,
            openParenToken,
            paramValues,
            commaTokens,
            closeParenToken,
        }, [target, typeArgList, openParenToken, ...interleave(paramValues, commaTokens), closeParenToken]);
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

export function parse(source) {
    // start with 'soft' as false because Program is implicitly definite
    const parser = { soft: false, peeked: 0 };
    // This is a triple-wrapped iterator:
    // 1. the tokenizer yields tokens one at a time
    // 2. the lookahead iterator allows us to peek at succeeding tokens without consuming them
    // 3. the new line check iterator filters new lines and adds a new line flag to each token preceding a new line
    parser.tokenizer = new NewLineCheckIterator(new LookaheadIterator(new Tokenizer(source)));
    parser.tokenizer.peeked = 0;
    return acceptProgram(parser);
}

/**
 * Program ::= ImportDeclaration* Declaration*
 */
export function acceptProgram(parser) {
    return accept(parser, [
        { name: 'imports', parse: acceptImportDeclaration, zeroOrMore: true },
        { name: 'declarations', parse: acceptDeclaration, zeroOrMore: true },
        { name: 'eof', type: 'EOF' },
    ], AST.Program);
}

/**
 * ImportDeclaration ::= IMPORT FROM STRING_LITERAL COLON ImportList
 */
export function acceptImportDeclaration(parser) {
    return accept(parser, [
        { name: 'importToken', type: 'IMPORT', definite: true },
        { name: 'fromToken', type: 'FROM', mess: mess.INVALID_IMPORT },
        { name: 'moduleNameToken', type: 'STRING_LITERAL', mess: mess.INVALID_IMPORT_MODULE },
        { name: 'colonToken', type: 'COLON', mess: mess.INVALID_IMPORT },
        { name: 'imports', parse: acceptImportList, mess: mess.INVALID_IMPORT },
    ], AST.ImportDeclaration);
}

/**
 * ImportList ::= IDENT
 *              | NamedImports
 */
export function acceptImportList(parser) {
    return accept(parser, [{
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
    return accept(parser, [
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'importComponents', parse: acceptImportComponent, mess: mess.INVALID_IMPORT, oneOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeBraceToken', type: 'RBRACE', mess: mess.INVALID_IMPORT },
    ], AST.NamedImports);
}

/**
 * ImportComponent ::= IDENT | ImportWithAlias
 */
export function acceptImportComponent(parser) {
    return accept(parser, [{
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
    return accept(parser, [
        { name: 'importNameToken', type: 'IDENT' },
        { name: 'asToken', type: 'AS', definite: true },
        { name: 'importAliasToken', type: 'IDENT', mess: mess.INVALID_IMPORT },
    ], AST.ImportWithAlias);
}

/**
 * Declaration ::= FunctionDeclaration | TypeDeclaration | ExportDeclaration
 */
export function acceptDeclaration(parser) {
    return accept(parser, [{
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
    return accept(parser, [
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
 * ParameterList ::= LPAREN Param(+ sep COMMA) RPAREN
 */
export function acceptParameterList(parser) {
    return accept(parser, [
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'params', parse: acceptParam, zeroOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeParenToken', type: 'RPAREN', mess: mess.MISSING_CLOSE_PAREN },
    ], AST.ParameterList);
}

/**
 * Param ::= Type IDENT
 */
export function acceptParam(parser) {
    return accept(parser, [
        { name: 'typeNode', parse: acceptType, mess: mess.INVALID_PARAMETER_TYPE },
        { name: 'nameToken', type: 'IDENT', mess: mess.INVALID_PARAMETER_NAME },
    ], AST.Param);
}

/**
 * FunctionBody ::= Expression | Statement
 */
export function acceptFunctionBody(parser) {
    return accept(parser, [{
        choices: [
            { name: 'expressionBody', parse: acceptExpression },
            { name: 'statementBody', parse: acceptStatement },
        ],
    }], AST.FunctionBody);
}

/**
 * TypeDeclaration ::= TYPE IDENT TypeParamList? EQUALS Type
 */
export function acceptTypeDeclaration(parser) {
    return accept(parser, [
        { name: 'typeToken', type: 'TYPE', definite: true },
        { name: 'typeNameToken', type: 'IDENT', mess: mess.INVALID_TYPE_NAME },
        { name: 'typeParamList', parse: acceptTypeParamList, optional: true },
        { name: 'equalsToken', type: 'EQUALS', mess: mess.TYPE_DECL_MISSING_EQUALS },
        { name: 'typeNode', parse: acceptType, mess: mess.INVALID_TYPE },
    ], AST.TypeDeclaration);
}

/**
 * ExportDeclaration ::= EXPORT ExportName ExportValue?
 */
export function acceptExportDeclaration(parser) {
    return accept(parser, [
        { name: 'exportToken', type: 'EXPORT', definite: true },
        { name: 'exportName', parser: acceptExportName },
        { name: 'exportDefinition', parser: acceptExportValue, optional: true },
    ], AST.ExportDeclaration);
}

/**
 * ExportName ::= DEFAULT | NamedExport
 */
export function acceptExportName(parser) {
    return accept(parser, [{
        choices: [
            { name: 'defaultToken', type: 'DEFAULT' },
            { name: 'namedExport', parser: acceptNamedExport },
        ],
    }], AST.ExportName);
}

/**
 * NamedExport ::= IDENT EQUALS
 */
export function acceptNamedExport(parser) {
    return accept(parser, [
        { name: 'exportNameToken', type: 'IDENT' },
        { name: 'equalsToken', type: 'EQUALS' },
    ], AST.NamedExport);
}

/**
 * ExportValue ::= FunctionDeclaration | TypeDeclaration | Expression
 */
export function acceptExportValue(parser) {
    return accept(parser, [{
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
    return accept(parser, [
        { name: 'openLtToken', image: '<', definite: true },
        { name: 'typeParams', parse: acceptTypeParam, mess: mess.INVALID_TYPE_PARAM, oneOrMore: true, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeGtToken', image: '<', definite: true },
    ], AST.TypeParamList);
}

/**
 * TypeParam ::= VarianceOp? IDENT TypeConstraint?
 */
export function acceptTypeParam(parser) {
    return accept(parser, [
        { name: 'varianceOp', parse: acceptVarianceOp, optional: true },
        { name: 'identToken', type: 'IDENT', mess: mess.INVALID_TYPE_PARAM },
        { name: 'typeConstraint', parse: acceptTypeConstraint, optional: true },
    ], AST.TypeParam);
}

/**
 * VarianceOp ::= PLUS | MINUS
 */
export function acceptVarianceOp(parser) {
    return accept(parser, [{
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
    return accept(parser, [
        { name: 'constraintOp', parse: acceptConstraintOp, definite: true },
        { name: 'constraintType', parse: acceptType, mess: mess.INVALID_TYPE_PARAM },
    ]);
}

/**
 * ConstraintOp ::= COLON | ASS_FROM
 */
export function acceptConstraintOp(parser) {
    return accept(parser, [{
        choices: [
            { name: 'assignableToToken', type: 'COLON' },
            { name: 'assignableFromToken', type: 'ASS_FROM' },
        ],
    }], AST.ConstraintOp);
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
    return accept(parser, [{
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
                { name: 'parenthesized', parse: acceptParenthesizedType },
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
    return accept(parser, [
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'fields', parse: acceptField, zeroOrMore: true },
        { name: 'closeBraceToken', type: 'RBRACE', mess: mess.INVALID_STRUCT_NO_CLOSE_BRACE },
    ], AST.StructType);
}

/**
 * Field ::= Type IDENT
 */
export function acceptField(parser) {
    return accept(parser, [
        { name: 'typeNode', parse: acceptType, mess: mess.INVALID_FIELD_TYPE },
        { name: 'nameToken', type: 'IDENT', mess: mess.INVALID_FIELD_NAME },
    ], AST.Field);
}

/**
 * FunctionType ::= LPAREN Type(* sep COMMA) RPAREN FAT_ARROW Type
 */
export function acceptFunctionType(parser) {
    return accept(parser, [
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'paramTypes', parse: acceptType, zeroOrMore: true, mess: mess.INVALID_TYPE, sep: { name: 'commaTokens', type: 'COMMA', mess: mess.FUNCTION_TYPE_MISSING_COMMA } },
        { name: 'closeParenToken', type: 'RPAREN' },
        { name: 'fatArrowToken', type: 'FAT_ARROW', definite: true },
        { name: 'returnType', parse: acceptType, mess: mess.FUNCTION_TYPE_INVALID_RETURN_TYPE },
    ], AST.FunctionType);
}

/**
 * ParenthesizedType ::= LPAREN Type RPAREN
 */
export function acceptParenthesizedType(parser) {
    return accept(parser, [
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'paramTypes', parse: acceptType, mess: mess.INVALID_TYPE },
        { name: 'closeParenToken', type: 'RPAREN', definite: true },
    ], AST.ParenthesizedType);
}

/**
 * TupleType ::= LPAREN Type(* sep COMMA) RPAREN
 */
export function acceptTupleType(parser) {
    return accept(parser, [
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'paramTypes', parse: acceptType, zeroOrMore: true, mess: mess.INVALID_TYPE, sep: { name: 'commaTokens', type: 'COMMA', definite: true, mess: mess.FUNCTION_TYPE_MISSING_COMMA } },
        { name: 'closeParenToken', type: 'RPAREN' },
    ], AST.FunctionType);
}

/**
 * GenericType ::= IDENT TypeArgList
 */
export function acceptGenericType(parser) {
    return accept(parser, [
        { name: 'identToken', type: 'IDENT' },
        { name: 'typeArgList', parse: acceptTypeArgList, definite: true },
    ], AST.GenericType);
}

/**
 * TypeArgList ::= LT Type(+ sep COMMA) GT
 */
export function acceptTypeArgList(parser) {
    return accept(parser, [
        { name: 'openLtToken', image: '<', definite: true },
        { name: 'types', parse: acceptType, oneOrMore: true, mess: mess.INVALID_TYPE_ARGUMENT, sep: { name: 'commaTokens', type: 'COMMA' } },
        { name: 'closeGtToken', image: '>', mess: mess.INVALID_TYPE_ARG_LIST },
    ], AST.TypeArgList);
}

/**
 * ArrayTypeSuffix ::= LBRACK RBRACK
 */
export function acceptArrayTypeSuffix(parser) {
    return accept(parser, [
        { name: 'openBracketToken', type: 'LBRACK', definite: true },
        { name: 'closeBracketToken', type: 'RBRACK' },
    ], AST.ArrayType);
}

/**
 * UnionTypeSuffix ::= VBAR Type
 */
export function acceptUnionTypeSuffix(parser) {
    return accept(parser, [
        { name: 'vbarToken', image: '|', definite: true },
        { name: 'right', parse: acceptType, mess: mess.INVALID_UNION_TYPE },
    ], AST.UnionType);
}

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
    return accept(parser, [{
        leftRecursive: {
            bases: [
                { name: 'integerLiteralToken', type: 'INTEGER_LITERAL' },
                { name: 'floatLiteralToken', type: 'FLOAT_LITERAL' },
                { name: 'stringLiteralToken', type: 'STRING_LITERAL' },
                { name: 'charLiteralToken', type: 'CHAR_LITERAL' },
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
                { name: 'inner', parse: acceptParentheticalExpression },
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
    return accept(parser, [
        { name: 'varIdentToken', type: 'IDENT' },
        { name: 'equalsToken', type: 'EQUALS', definite: true },
        { name: 'initialValue', parse: acceptExpression, mess: mess.INVALID_INITIAL_VALUE },
    ], AST.VarDeclaration);
}

/**
 * ShorthandLambdaExpression ::= IDENT FAT_ARROW FunctionBody
 */
export function acceptShorthandLambdaExpression(parser) {
    return accept(parser, [
        { name: 'shorthandParam', type: 'IDENT' },
        { name: 'fatArrowToken', type: 'FAT_ARROW', definite: true },
        { name: 'body', parse: acceptFunctionBody },
    ], AST.LambdaExpression);
}

/**
 * ArrayLiteral ::= LBRACK Expression(* sep COMMA) RBRACK
 */
export function acceptArrayLiteral(parser) {
    return accept(parser, [
        { name: 'openBracketToken', type: 'LBRACK', definite: true },
        { name: 'items', parse: acceptExpression, zeroOrMore: true, mess: mess.INVALID_EXPRESSION, sep: { name: 'commaTokens', type: 'COMMA', mess: mess.ARRAY_LITERAL_MISSING_COMMA } },
        { name: 'closeBracketToken', type: 'RBRACK' },
    ], AST.ArrayLiteral);
}

/**
 * StructLiteral ::= LBRACE StructEntry(* sep COMMA) RBRACE
 */
export function acceptStructLiteral(parser) {
    return accept(parser, [
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'entries', parse: acceptStructEntry, zeroOrMore: true, sep: { name: 'commaTokens', type: 'COMMA', mess: mess.STRUCT_LITERAL_MISSING_COMMA } },
        { name: 'closeBraceToken', type: 'RBRACE' },
    ], AST.ArrayLiteral);
}

/**
 * StructEntry ::= IDENT COLON Expression
 */
export function acceptStructEntry(parser) {
    return accept(parser, [
        { name: 'keyToken', type: 'IDENT', definite: true },
        { name: 'colonToken', type: 'COLON', mess: mess.STRUCT_LITERAL_MISSING_COLON },
        { name: 'value', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], AST.StructEntry);
}

/**
 * IfElseExpression ::= IF LPAREN Expression RPAREN Expression ELSE Expression
 */
export function acceptIfElseExpression(parser) {
    return accept(parser, [
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
 * PrefixExpression ::= OPER Expression
 */
export function acceptPrefixExpression(parser) {
    return accept(parser, [
        { name: 'operatorToken', type: 'OPER', definite: true },
        { name: 'target', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], AST.PrefixExpression);
}

/**
 * LambdaExpression ::= LPAREN LambdaParam(* sep COMMA) RPAREN FAT_ARROW FunctionBody
 */
export function acceptLambdaExpression(parser) {
    return accept(parser, [
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
    return accept(parser, [{
        choices: [
            { name: 'typedParam', parse: acceptParam },
            { name: 'identToken', type: 'IDENT' },
        ],
    }], AST.LambdaParam);
}

/**
 * ParentheticalExpression ::= LPAREN Expression RPAREN
 */
export function acceptParentheticalExpression(parser) {
    return accept(parser, [
        { name: 'openParenToken', type: 'LPAREN' },
        { name: 'inner', parse: acceptExpression },
        { name: 'closeParenToken', type: 'RPAREN', definite: true },
    ], AST.ParentheticalExpression);
}

/**
 * TupleLiteral ::= LPAREN Expression(* sep COMMA) RPAREN
 */
export function acceptTupleLiteral(parser) {
    return accept(parser, [
        { name: 'openParenToken', type: 'LPAREN', definite: true },
        { name: 'items', parse: acceptExpression, zeroOrMore: true, mess: mess.INVALID_EXPRESSION, sep: { name: 'commaTokens', type: 'COMMA', mess: mess.TUPLE_LITERAL_MISSING_COMMA } },
        { name: 'closeParenToken', type: 'RPAREN' },
    ], AST.TupleLiteral);
}

/**
 * FunctionApplicationSuffix ::= TypeArgList? LPAREN Expression(* sep COMMA) RPAREN
 */
export function acceptFunctionApplicationSuffix(parser) {
    return accept(parser, [
        { name: 'typeArgList', parse: acceptTypeArgList, optional: true },
        { name: 'openParenToken', type: 'LPAREN', definite: true },
        { name: 'args', parse: acceptExpression, zeroOrMore: true, mess: mess.INVALID_EXPRESSION, sep: { name: 'commaTokens', type: 'COMMA', mess: mess.FUNCTION_APPLICATION_MISSING_COMMA } },
        { name: 'closeParenToken', type: 'RPAREN' },
    ], AST.FunctionApplication);
}

/**
 * BinaryExpressionSuffix ::= OPER Expression
 */
export function acceptBinaryExpressionSuffix(parser) {
    return accept(parser, [
        { name: 'operatorToken', type: 'OPER' },
        { name: 'right', parse: acceptExpression, definite: true },
    ], AST.BinaryExpression);
}

/**
 * PostfixExpressionSuffix ::= OPER
 */
export function acceptPostfixExpressionSuffix(parser) {
    return accept(parser, [
        { name: 'operatorToken', type: 'OPER', definite: true },
    ], AST.PostfixExpression);
}

/**
 * FieldAccessSuffix ::= DOT IDENT
 */
export function acceptFieldAccessSuffix(parser) {
    return accept(parser, [
        { name: 'dotToken', type: 'DOT', definite: true },
        { name: 'fieldNameToken', type: 'IDENT', mess: mess.FIELD_ACCESS_INVALID_FIELD_NAME },
    ], AST.FieldAccess);
}

/**
 * ArrayAccessSuffix ::= LBRACK Expression RBRACK
 */
export function acceptArrayAccessSuffix(parser) {
    return accept(parser, [
        { name: 'openBracketToken', type: 'LBRACK', definite: true },
        { name: 'indexExp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
        { name: 'closeBracketToken', type: 'RBRACK', mess: mess.ARRAY_ACCESS_MISSING_CLOSE_BRACKET },
    ], AST.ArrayAccess);
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
export function acceptStatement(parser) {
    return accept(parser, [{
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
    return accept(parser, [
        { name: 'openBraceToken', type: 'LBRACE', definite: true },
        { name: 'statements', parse: acceptStatement, zeroOrMore: true },
        { name: 'closeBraceToken', type: 'RBRACE', mess: mess.MISSING_CLOSE_BRACE },
    ], AST.Block);
}

/**
 * ForStatement ::= FOR LPAREN IDENT IN Expression RPAREN Block
 */
export function acceptForStatement(parser) {
    return accept(parser, [
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
    return accept(parser, [
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
    return accept(parser, [
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
    return accept(parser, [
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
    return accept(parser, [
        { name: 'catchToken', type: 'CATCH', mess: mess.TRY_CATCH_MISSING_CATCH },
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
    return accept(parser, [
        { name: 'finallyToken', type: 'FINALLY', definite: true },
        { name: 'finallyBlock', parse: acceptStatement, mess: mess.INVALID_STATEMENT },
    ], AST.FinallyClause);
}

/**
 * ThrowStatement ::= THROW Expression
 */
export function acceptThrowStatement(parser) {
    return accept(parser, [
        { name: 'throwToken', type: 'THROW', definite: true },
        { name: 'exp', parse: acceptExpression, mess: mess.INVALID_EXPRESSION },
    ], AST.ThrowStatement);
}

/**
 * ReturnStatement ::= RETURN Expression?
 */
export function acceptReturnStatement(parser) {
    return accept(parser, [
        { name: 'returnToken', type: 'RETURN', definite: true },
        { name: 'exp', parse: acceptExpression, optional: true, mess: mess.INVALID_EXPRESSION },
    ], AST.ReturnStatement);
}

/**
 * BreakStatement ::= BREAK INTEGER_LITERAL?
 */
export function acceptBreakStatement(parser) {
    return accept(parser, [
        { name: 'breakToken', type: 'BREAK', definite: true },
        { name: 'loopNumber', type: 'INTEGER_LITERAL', optional: true },
    ], AST.ContinueStatement);
}

/**
 * ContinueStatement ::= CONTINUE INTEGER_LITERAL?
 */
export function acceptContinueStatement(parser) {
    return accept(parser, [
        { name: 'continueToken', type: 'CONTINUE', definite: true },
        { name: 'loopNumber', type: 'INTEGER_LITERAL', optional: true },
    ], AST.ContinueStatement);
}

// ///////////////////////////
// PARSER CONTROL FUNCTIONS //
// ///////////////////////////

/**
 * Gets the next token from the parser, taking into account the soft flag.
 */
function getNextToken(parser) {
    if (parser.soft) {
        const tok = parser.tokenizer.peek(parser.tokenizer.peeked);
        parser.tokenizer.peeked++;
        return tok;
    }
    return parser.tokenizer.next().value;
}

/**
 * Fast forwards the iteration of tokens to the current peeked location
 */
function consumePeekedTokens(parser) {
    for (; parser.tokenizer.peeked > 0; --parser.tokenizer.peeked) parser.tokenizer.next();
}

/**
 * Resets the peeking of tokens to the previously consumed point
 */
function resetPeekedTokens(parser) {
    parser.tokenizer.peeked = 0;
}

/**
 * Creates a message from either a string or a function
 */
function createMessage(message, tok) {
    return (typeof message === 'string') ? message : message(tok);
}

/**
 * Given a definite flag, change the parser state if it is true
 */
function processDefiniteFlag(definite, parser) {
    if (!definite) return;
    parser.soft = false;
    consumePeekedTokens(parser);
}

/**
 * THE ENGINE OF THE PARSER
 * So this function has to be huge because there is a ton of control flow logic here, unfortunately.
 * The parser runs off of a configuration for each non-terminal in the grammar.
 *
 * Here are the options we require:
 * - 'name': specifies the field name on the resulting AST node object
 * - either 'type', 'image', or 'parse':
 *   - 'type' and 'image' are the corresponding fields on tokens used to check for terminals
 *   - 'parse' specifies a non-terminal parse function
 *
 * Here are the fields that are required to appear in the defs list somewhere in specific situations:
 * - 'definite': specifies the component which, when parsed, means that this expansion is the correct path chosen.
 *   - If, until this point, we have been parsing softly, we can consume all softly parsed tokens
 *   - After this point, if a token does not match, it is an actual error
 *   - This option must appear on AT LEAST ONE component of a sequential expansion, and cannot appear on any choice expansions
 * - 'mess': In the event of an error on this component, throw an error with this message or message generator function
 * - 'choices': Specifies a choice expansion, where each child is checked in order until one is matched definitely
 * - 'leftRecursive': A special kind of choice expansion where there are at least one left-recursive choices
 *   - 'bases': The list of non-left-recursive choices, which are normal choices
 *   - 'suffixes': The list of left-recursive choices, which should only parse the suffix of the choice, ignoring the left-recursive part
 *     - 'baseName': The name of the field in the left-recursive AST object that should be used for the prefix portion
 *
 * Here are optional fields:
 * - 'optional': specifies that this component is optional.
 *   - The component MUST be parsed softly, and in the event of a failure, it should be skipped
 * - 'zeroOrMore' or 'oneOrMore': specifies that this component can be repeated.
 *   - Either one or the other can appear, but not both.
 *   - 'zeroOrMore' means that the component can appear 0 or more times, and 'oneOrMore' means 1 or more times
 *   - In the event of oneOrMore, parse one instance of the component as if it were non-optional, then proceed to the repetition phase
 *   - In the repetition phase, parse softly, skipping the component and continuing in the event of a failure
 * - 'sep': specifies for a repeated component another component that must separate each instance
 *   - Obviously, this can only appear alongside 'zeroOrMore' and 'oneOrMore'
 *   - After each repeated instance, one of these MUST be parsed softly.
 *   - In the event of a failure parsing the separator, the entire repetition is broken out of
 *   - In the event of a success parsing the separator, the next instance MUST be parsed definitely
 *
 * Operation of the parser:
 * - So there are 4 "modes" of the parser:
 *   1. Sequential mode: parse expansion components in sequence
 *   2. Choice mode: parse choice expansions by trying each option separately until one works
 *   3. Left-recursive mode: same as choice mode, but check for left-recursive options after the non-left-recursive ones
 *   4. Repetition mode: same as sequential mode, but loop for components that can be repeated
 * - There is also a 'soft' flag in the parser to indicate whether tokens should be consumed or just peeked,
 *   and whether failures should simply return false or throw an error.
 *   Child components will inherit the parent's soft flag unless the parent overrides it.
 * - Sequential mode is default, each def is used to accept or reject the next sequence of n tokens.
 *   In the even of a failure, optional components are skipped, the soft flag will cause false to be returned, or an error will be thrown.
 *   A success will cause the parsed component to be queued for addition to the parent node.
 *   The 'definite' flag on a component will cause the soft flag to be turned off for the remainder of the parent's operation.
 *   Once each def is processed, the resulting enumerated children are used to create an instance of the provided AST node class.
 * - Choice mode is used if one def is provided with the 'choices' key.
 *   Each child choice is enumerated and accepted softly. A failure will cause the choice to be ignored.
 *   The first succcessful choice will be used as the resulting single child of the node.
 *   If none succeed, false is returned so the parent can handle the error accordingly.
 * - Left-recursive mode is used if one def is provided with the 'leftRecursive' key.
 *   The 'bases' key under that will be treated the same as the 'choices' key.
 *   Once a base is chosen, the parser iterates all of the left-recursive suffixes repeatedly
 *   until it reaches an iteration where none of the suffixes succeed.
 *   Each successful suffix wraps the previous base as the new base.
 *   Once that loop exits, the resulting base is the parse result.
 *   Any failed suffix parse is ignored.
 * - Repetition mode is used as a sub-mode of sequential mode if a component has the oneOrMore or zeroOrMore flags.
 *   The definition is accepted repeatedly until it fails, after which all successful parses are grouped into
 *   a list and used as the resulting child. A oneOrMore flag will treat the first repeated item as required.
 *   If the component also specifies a 'sep' key, that value will be parsed as a separator which must be
 *   found between each repetition. If a separator is parsed, the next item is required.
 *   If a separator is not parsed, another item cannot follow and the component will be finished.
 */
export function accept(parser, defs, clss) {
    if (!defs[0].choices && !defs[0].leftRecursive) {
        // sequence expansion, process each def in order
        const comps = {}, children = [];
        sequentialLoop: for (const def of defs) {
            // check for repetitive components
            if (def.oneOrMore || def.zeroOrMore) {
                // repetitive components are organized into a list, with separators put into a list as well (if used)
                const list = [], seps = [];
                // this flag indicates if there was a separator prior, in which case the next item is required
                let wasSep = false;
                // this flag indicates that it is a oneOrMore repetition where the first item is required
                let handleFirst = !!def.oneOrMore;
                // enter repetition mode
                while (true) {
                    // use soft if: 1) handleFirst and wasSep are both false (this item isn't required), or 2) the parser is already soft
                    const soft = (!handleFirst && !wasSep) || parser.soft;
                    const [node, accepted] = acceptUsingDef(def, { ...parser, soft });
                    if (!accepted) {
                        if (handleFirst) {
                            // no match for first oneOrMore item, return false or throw error
                            if (parser.soft || !def.mess) {
                                resetPeekedTokens(parser);
                                return false;
                            }
                            throw new ParserError(createMessage(def.mess, node), node.line, node.column);
                        }
                        // if there was no separator prior, we treat this as the end of repetition
                        if (!wasSep) {
                            comps[def.name] = list;
                            if (def.sep) comps[def.sep.name] = seps;
                            children.push(...interleave(list, seps));
                            resetPeekedTokens(parser);
                            continue sequentialLoop;
                        }
                        if (parser.soft || !def.mess) {
                            resetPeekedTokens(parser);
                            return false;
                        }
                        throw new ParserError(createMessage(def.mess, node), node.line, node.column);
                    }
                    // after the first iteration this should always be false
                    handleFirst = false;
                    processDefiniteFlag(def.definite, parser);
                    list.push(node);
                    if (def.sep) {
                        // if there is a separator, parse for it
                        const sep = acceptUsingDef(def.sep, { ...parser, soft: true });
                        if (!sep) {
                            // no separator, repetition has to stop here
                            comps[def.name] = list;
                            comps[def.sep.name] = seps;
                            children.push(...interleave(list, seps));
                            resetPeekedTokens(parser);
                            continue sequentialLoop;
                        } else {
                            processDefiniteFlag(def.sep.definite, parser);
                            seps.push(sep);
                            wasSep = true;
                        }
                    }
                }
            }
            // Sequential mode
            console.log('parsing sequential component');
            const [node, accepted] = acceptUsingDef(def, parser);
            if (!accepted) {
                console.log('not accepted seq');
                // no match, if optional, skip it, if soft or no message, return false, otherwise throw an error
                if (def.optional) {
                    resetPeekedTokens(parser);
                    continue;
                }
                if (parser.soft || !def.mess) {
                    resetPeekedTokens(parser);
                    return false;
                }
                throw new ParserError(createMessage(def.mess, node), node.line, node.column);
            }
            console.log('accepted seq');
            processDefiniteFlag(def.definite, parser);
            // add that component
            children.push(comps[def.name] = node);
        }
        return new clss(comps, children);
    } else {
        // Choice mode and left-recursive mode
        let base;
        const choices = defs[0].choices || defs[0].leftRecursive.bases;
        for (const choice of choices) {
            console.log('parsing choice');
            const [node, accepted] = acceptUsingDef(choice, { ...parser, soft: true });
            if (!accepted) {
                console.log('not accepted choice');
                resetPeekedTokens(parser);
                continue;
            }
            console.log('accepted choice');
            base = new clss({ [choice.name]: node }, [node]);
            consumePeekedTokens(parser);
            break;
        }
        // if there was no match, the expansion failed
        if (!base) return false;
        // if this was not left-recursive, we're done
        if (defs[0].choices) return base;
        // Enter left-recursive mode
        recursiveRetryLoop: while (true) {
            for (const suff of defs[0].leftRecursive.suffixes) {
                const suffNode = suff.parse({ ...parser, soft: true });
                if (suffNode) {
                    // suffix matched, add the current base to the suffix node, wrap the suffix node
                    suffNode[suff.baseName] = base;
                    suffNode.children.unshift(base);
                    base = new clss({ [suff.name]: suffNode }, [suffNode]);
                    consumePeekedTokens(parser);
                    // try again
                    continue recursiveRetryLoop;
                } else {
                    resetPeekedTokens(parser);
                }
            }
            // we've gone a whole iteration with no matches, break out of the loop
            break;
        }
        return base;
    }
}

/**
 * Attempts to accept the next sequence according to the specified def and parser state.
 * Returns a tuple array containing [the next token or node, a flag indicating if the accept was successful]
 */
function acceptUsingDef(def, parser) {
    const subParser = { ...parser, soft: def.optional || parser.soft };
    if (def.type || def.image) {
        const tok = getNextToken(subParser);
        const accepted = def.type && (tok.type === def.type) || def.image && (def.image === tok.image);
        return [tok, accepted];
    } else if (def.parse) {
        const node = def.parse(subParser);
        return [node, !!node];
    } else {
        throw new Error('this should never happen');
    }
}
