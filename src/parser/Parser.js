import Tokenizer from './Tokenizer';
import LookaheadIterator from './LookaheadIterator';
import NewLineCheckIterator from './NewLineCheckIterator';
import * as AST from '../ast';
import ParserError from './ParserError';
import * as mess from './ParserMessages';


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
        if (!parsed && message) throw new ParserError(message, token.startLine, token.startColumn);
        return parsed;
    }

    /**
     * Get the next token, expecting it to be of type 'type',
     * throwing an error with message 'message' if it is not.
     */
    expectNextToken(type, message) {
        const token = this.tokenizer.next().value;
        this.enforceTokenType(token, type, message);
        return token;
    }

    /**
     * Check if the token is of the specified type,
     * throwing an error with the specified message if it is not.
     */
    enforceTokenType(token, type, message) {
        if (token.type !== type) {
            const formatted = (typeof message === 'function') ? message(token) : message;
            throw new ParserError(formatted, token.startLine, token.startColumn);
        }
    }

    /**
     * Check if the token has a new line after it,
     * throwing an error with the specified message if it is not.
     */
    enforceNewLine(token, message) {
        if (!token.hasNewLine) throw new ParserError(message, token.endLine, token.endColumn);
    }

    // PARSER FUNCTIONS

    /**
     * Top-level AST node.
     *
     * Program ::= ImportDeclaration* (FunctionDeclaration | TypeDeclaration | ExportDeclaration)*
     */
    acceptProgram() {
        const imports = [], functions = [], types = [], exports = [];
        for (const c of this.tokenizer) {
            let node;
            if (node = this.acceptImportDeclaration(c)) {
                if (functions.length || types.length) throw new ParserError(mess.IMPORT_AFTER_DECL, node.line, node.column);
                imports.push(node);
            } else if (node = this.acceptFunctionDeclaration(c)) {
                functions.push(node);
            } else if (node = this.acceptTypeDeclaration(c)) {
                types.push(node);
            } else if (node = this.acceptExportDeclaration(c)) {
                exports.push(node);
            } else if (c.type === 'EOF') {
                return new AST.Program(imports, functions, types, exports);
            } else {
                throw new ParserError(mess.INVALID_PROGRAM(c), c.startLine, c.startColumn);
            }
        }
        // empty program
        return new AST.Program();
    }

    /**
     * ImportDeclaration ::= IMPORT FROM STRING_LITERAL COLON IDENT
     *                       IMPORT FROM STRING_LITERAL LBRACE ImportComponent (COMMA ImportComponent)* RBRACE
     */
    acceptImportDeclaration(tok) {
        // this cannot be an import if the first token is not 'import'
        if (tok.type !== 'IMPORT') return false;
        // `from <string_literal>`
        const fromToken = this.expectNextToken('FROM', mess.INVALID_IMPORT);
        const moduleNameToken = this.expectNextToken('STRING_LITERAL', mess.INVALID_IMPORT_MODULE);

        const next = this.tokenizer.next().value;
        if (next.type === 'COLON') {
            // colon means default import
            const defaultImportNameToken = this.expectNextToken('IDENT', mess.INVALID_IMPORT);
            this.enforceNewLine(defaultImportNameToken, mess.IMPORT_NO_NEW_LINE);
            return new AST.ImportDeclaration({
                importToken: tok,
                fromToken,
                moduleNameToken,
                colonToken: next,
                defaultImportNameToken,
                defaultImport: true,
            });
        } else if (next.type === 'LBRACE') {
            // open brace means named imports
            const importComponents = [];
            // get the first one
            importComponents.push(this.acceptImportComponent(this.tokenizer.next().value, true));
            // as long as a comma follows, keep getting more
            let namedImportCloseBraceToken = this.tokenizer.next().value;
            while (namedImportCloseBraceToken.type === 'COMMA') {
                importComponents.push(this.acceptImportComponent(namedImportCloseBraceToken, false));
                namedImportCloseBraceToken = this.tokenizer.next().value;
            }
            // close brace and new line must follow import names
            this.enforceTokenType(namedImportCloseBraceToken, 'RBRACE', mess.INVALID_IMPORT);
            this.enforceNewLine(namedImportCloseBraceToken, mess.IMPORT_NO_NEW_LINE);
            return new AST.ImportDeclaration({
                importToken: tok,
                fromToken,
                moduleNameToken,
                namedImportOpenBraceToken: next,
                importComponents,
                namedImportCloseBraceToken,
                defaultImport: false,
            });
        } else {
            throw new ParserError(mess.INVALID_IMPORT, next.startLine, next.startColumn);
        }
    }

    /**
     * ImportComponent ::= IDENT
     *                     IDENT AS IDENT
     */
    acceptImportComponent(tok, first) {
        let commaToken;
        // a comma must separate each import name, so it will come before all but the first name
        if (!first) {
            this.enforceTokenType(tok, 'COMMA', mess.INVALID_IMPORT);
            [commaToken, tok] = [tok, this.tokenizer.next().value];
        }
        this.enforceTokenType(tok, 'IDENT', mess.INVALID_IMPORT);
        if (this.tokenizer.peek().type === 'AS') {
            const asToken = this.tokenizer.next().value;
            const importAliasToken = this.expectNextToken('IDENT', mess.INVALID_IMPORT);
            return new AST.ImportComponent({
                commaToken,
                importNameToken: tok,
                asToken,
                importAliasToken,
            });
        } else {
            return new AST.ImportComponent({
                commaToken,
                importNameToken: tok,
            });
        }
    }

    /**
     * FunctionDeclaration ::= FUNC Type IDENT ParameterList FAT_ARROW (Expression | Block)
     */
    acceptFunctionDeclaration(tok) {
        // functions must start with 'func'
        if (tok.type !== 'FUNC') return false;
        const returnType = this.parseNextToken(t => this.acceptType(t), mess.INVALID_RETURN_TYPE);
        const functionNameToken = this.expectNextToken('IDENT', mess.INVALID_FUNCTION_NAME);
        const params = this.parseNextToken(t => this.acceptParameterList(t), mess.INVALID_PARAMETER_LIST);
        const fatArrowToken = this.expectNextToken('FAT_ARROW', mess.INVALID_FAT_ARROW);
        const next = this.tokenizer.next().value;
        let functionBody = this.acceptExpression(next);
        if (!functionBody) functionBody = this.acceptBlock(next);
        if (!functionBody) throw new ParserError(mess.INVALID_FUNCTION_BODY, next.startLine, next.startColumn);
        return new AST.FunctionDeclaration({
            funcToken: tok,
            returnType,
            functionNameToken,
            params,
            fatArrowToken,
            functionBody,
        });
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
            if (exportedValue = this.acceptFunctionDeclaration(next)) {
                return new AST.ExportDeclaration({
                    exportToken: tok,
                    defaultToken,
                    exportedValue,
                });
            } else if (exportedValue = this.acceptTypeDeclaration(next)) {
                return new AST.ExportDeclaration({
                    exportToken: tok,
                    defaultToken,
                    exportedValue,
                });
            } else if (exportedValue = this.acceptExpression(next)) {
                return new AST.ExportDeclaration({
                    exportToken: tok,
                    defaultToken,
                    exportedValue,
                });
            } else {
                throw new ParserError(mess.INVALID_DEFAULT_EXPORT_VALUE, tok.startLine, tok.startColumn);
            }
        }
        if (next.type === 'IDENT') {
            const exportName = next;
            next = this.tokenizer.peek();
            if (next.type === 'EQUALS') {
                const equalsToken = this.tokenizer.next().value;
                let exportedValue;
                if (exportedValue = this.acceptFunctionDeclaration(next)) {
                    return new AST.ExportDeclaration({
                        exportToken: tok,
                        exportName,
                        equalsToken,
                        exportedValue,
                    });
                } else if (exportedValue = this.acceptTypeDeclaration(next)) {
                    return new AST.ExportDeclaration({
                        exportToken: tok,
                        exportName,
                        equalsToken,
                        exportedValue,
                    });
                } else if (exportedValue = this.acceptExpression(next)) {
                    return new AST.ExportDeclaration({
                        exportToken: tok,
                        exportName,
                        equalsToken,
                        exportedValue,
                    });
                } else {
                    throw new ParserError(mess.INVALID_NAMED_EXPORT_VALUE, tok.startLine, tok.startColumn);
                }
            } else {
                this.enforceNewLine(next, mess.EXPORT_NO_NEW_LINE);
                return new AST.ExportDeclaration({
                    exportToken: tok,
                    exportName,
                });
            }
        }
        throw new ParserError(mess.INVALID_EXPORT_DECLARATION);
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
        // handle built-in types
        switch (tok.type) {
            case 'U8': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'I8': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'BYTE': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'U16': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'I16': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'SHORT': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'U32': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'I32': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'INTEGER': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'U64': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'I64': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'LONG': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'INT': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'F32': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'FLOAT': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'F64': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'DOUBLE': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'STRING': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'CHAR': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'BOOL': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'VOID': typeNode = new AST.Type({ builtIn: tok }); break;
            case 'IDENT': typeNode = new AST.Type({ name: tok }); break;
            default: break;
        }
        // handle alternative types
        let type;
        if (type = this.acceptStructType(tok)) typeNode = new AST.Type({ structType: type });
        else if (type = this.acceptFunctionType(tok)) typeNode = new AST.Type({ functionType: type }); // TODO: tuple type will register as invalid function type
        else if (type = this.acceptTupleType(tok)) typeNode = new AST.Type({ tupleType: type });
        else return false;
        // array types are left recursive
        let [peek1, peek2] = this.tokenizer.peek(0, 2);
        while (peek1.type === 'LBRACK' && peek2.type === 'RBRACK') {
            typeNode = new AST.Type({
                baseType: typeNode,
                arrayLeftBracketToken: this.tokenizer.next().value,
                arrayRightBracketToken: this.tokenizer.next().value,
            });
            [peek1, peek2] = this.tokenizer.peek(0, 2);
        }
        return typeNode;
    }

    /**
     * ParameterList ::= LPAREN (Param (COMMA Param)*)? RPAREN
     */
    acceptParameterList(tok) {
        if (tok.type !== 'LPAREN') return false;
        let peek = this.tokenizer.peek();
        const params = [];
        if (peek.type !== 'RPAREN') {
            // try to parse a parameter
            params.push(this.parseNextToken(t => this.acceptParam(t)));
            while ((peek = this.tokenizer.peek()).type === 'COMMA') {
                const commaToken = this.tokenizer.next().value;
                const param = this.parseNextToken(t => this.acceptParam(t));
                param.commaToken = commaToken;
                params.push(param);
            }
        }
        // close param list
        peek = this.tokenizer.peek();
        this.enforceTokenType(peek, 'RPAREN', mess.MISSING_CLOSE_PAREN);
        return new AST.ParameterList({
            openParenToken: tok,
            params,
            closeParenToken: this.tokenizer.next().value,
        });
    }

    /**
     * Param ::= Type IDENT
     */
    acceptParam(tok) {
        const type = this.acceptType(tok);
        if (!type) throw new ParserError(mess.INVALID_PARAMETER_TYPE, tok.startLine, tok.startColumn);
        const identifierToken = this.expectNextToken('IDENT', mess.INVALID_PARAMETER_NAME);
        return new AST.Param({
            type,
            identifierToken,
        });
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
            case 'INTEGER_LITERAL': exp = new AST.Expression({ integerLiteralToken: tok }); break;
            case 'FLOAT_LITERAL': exp = new AST.Expression({ floatLiteralToken: tok }); break;
            case 'STRING_LITERAL': exp = new AST.Expression({ stringLiteralToken: tok }); break;
            case 'CHARACTER_LITERAL': exp = new AST.Expression({ characterLiteralToken: tok }); break;
            case 'IDENT': {
                if (inner = this.acceptVarDeclaration(tok)) {
                    exp = new AST.Expression({ varDecl: inner });
                } else if (inner = this.acceptLambdaExpression(tok)) {
                    exp = new AST.Expression({ lambda: inner });
                } else {
                    exp = new AST.Expression({ identToken: tok });
                }
                break;
            }
            default: break;
        }
        // other literals/expressions
        if (inner = this.acceptArrayLiteral(tok)) {
            exp = new AST.Expression({ arrayLiteral: inner });
        } else if (inner = this.acceptStructLiteral(tok)) {
            exp = new AST.Expression({ structLiteral: inner });
        } else if (inner = this.acceptIfElseExpression(tok)) {
            exp = new AST.Expression({ ifElse: inner });
        } else if (inner = this.acceptPrefixExpression(tok)) {
            exp = new AST.Expression({ unary: inner });
        } else if (tok.type === 'LPAREN') {
            // handle parentheses
            if (inner = this.acceptLambdaExpression(tok)) {
                exp = new AST.Expression({ lambda: inner });
            } else if (inner = this.acceptTupleLiteral(tok)) {
                exp = new AST.Expression({ tupleLiteral: inner });
            }
        }
        if (!exp) {
            throw new ParserError(mess.INVALID_EXPRESSION, tok.startLine, tok.startColumn);
        }
        // handle left recursion, expressions that start with an inner expression
        while (true) {
            let outer;
            if (outer = this.tryFunctionApplication(exp)) {
                exp = new AST.Expression({ functionApplication: outer });
            } else if (outer = this.tryPostfixExpression(exp)) {
                exp = new AST.Expression({ unary: outer });
            } else if (outer = this.tryBinaryExpression(exp)) {
                exp = new AST.Expression({ binary: outer });
            } else if (outer = this.tryFieldAccess(exp)) {
                exp = new AST.Expression({ fieldAccess: outer });
            } else if (outer = this.tryArrayAccess(exp)) {
                exp = new AST.Expression({ arrayAccess: outer });
            } else {
                break;
            }
        }
        return exp;
    }

    /**
     * Block ::= LBRACE Statement* RBRACE |
     *           Statement
     */
    acceptBlock(tok) {
        if (tok.type === 'LBRACE') {
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
            });
        }
        const statement = this.acceptStatement(tok);
        if (!statement) return false;
        return new AST.Block({ statement });
    }

    /**
     * StructType ::= LBRACE (Type IDENT)* RBRACE
     */
    acceptStructType(tok) {
        if (tok.type !== 'LBRACE') return false;
        const fields = [];
        while (this.tokenizer.peek().type !== 'RBRACE') {
            const type = this.parseNextToken(t => this.acceptType(t), mess.INVALID_FIELD_TYPE);
            const identToken = this.expectNextToken('IDENT', mess.INVALID_FIELD_NAME);
            this.enforceNewLine(identToken, mess.STRUCT_FIELD_NO_NEW_LINE);
            fields.push({ type, identToken });
        }
        return new AST.StructType({
            openBraceToken: tok,
            fields,
            closeBraceToken: this.tokenizer.next().value,
        });
    }

    /**
     * FunctionType ::= LPAREN (Type (COMMA Type)*)? RPAREN FAT_ARROW Type
     */
    acceptFunctionType(tok) {
        if (tok.type !== 'LPAREN') return false;
        const types = [];
        if (this.tokenizer.peek().type !== 'RPAREN') {
            // parse types of parameters
            types.push(this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE));
            while (this.tokenizer.peek().type !== 'RPAREN') {
                const commaToken = this.expectNextToken('COMMA', mess.FUNCTION_TYPE_MISSING_COMMA);
                const type = this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE);
                type.commaToken = commaToken;
                types.push(type);
            }
        }
        const closeParenToken = this.tokenizer.next().value;
        const fatArrowToken = this.expectNextToken('FAT_ARROW', mess.FUNCTION_TYPE_MISSING_FAT_ARROW);
        const returnType = this.parseNextToken(t => this.acceptType(t), mess.FUNCTION_TYPE_INVALID_RETURN_TYPE);
        return new AST.FunctionType({
            openParenToken: tok,
            paramTypes: types,
            closeParenToken,
            fatArrowToken,
            returnType,
        });
    }

    /**
     * TupleType ::= LPAREN (Type (COMMA Type)*)? RPAREN
     */
    acceptTupleType(tok) {
        if (tok.type !== 'LPAREN') return false;
        if (this.tokenizer.peek().type === 'RPAREN') {
            return new AST.TupleType({
                openParenToken: tok,
                types: [],
                closeParenToken: this.tokenizer.next().value,
            });
        }
        const types = [this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE)];
        while (this.tokenizer.peek().type !== 'RPAREN') {
            const commaToken = this.expectNextToken('COMMA', mess.TUPLE_TYPE_MISSING_COMMA);
            const type = this.parseNextToken(t => this.acceptType(t), mess.INVALID_TYPE);
            type.commaToken = commaToken;
            types.push(type);
        }
        // if there is only one type, it's just a type, not a tuple type
        if (types.length === 1) {
            return new AST.Type({
                openParenToken: tok,
                innerType: types[0],
                closeParenToken: this.tokenizer.next().value,
            });
        }
        return new AST.TupleType({
            openParenToken: tok,
            types,
            closeParenToken: this.tokenizer.next().value,
        });
    }
}
