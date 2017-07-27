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
        if (!parsed) throw new ParserError(message, token.startLine, token.startColumn);
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
            //} else if (node = this.acceptTypeDeclaration(c)) {
            //    types.push(node);
            //} else if (node = this.acceptExportDeclaration(c)) {
            //    exports.push(node);
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
     *          (LPAREN Type RPAREN)   # Explicitly bounded type
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
            default: break;
        }
        // handle alternative types
        let type;
        if (type = this.acceptStructType(tok)) typeNode = new AST.Type({ structType: type });
        else if (type = this.acceptTupleType(tok)) typeNode = new AST.Type({ tupleType: type });
        else if (type = this.acceptFunctionType(tok)) typeNode = new AST.Type({ functionType: type });
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
            params.push(this.parseNextToken(t => this.acceptParam(t), mess.INVALID_FUNCTION_PARAMETER));
            while ((peek = this.tokenizer.peek()).type === 'COMMA') { // TODO: handle case where it is not a comma
                const commaToken = this.tokenizer.next().value; // TODO: figure out where to put comma
                params.push(this.parseNextToken(t => this.acceptParam(t), mess.INVALID_FUNCTION_PARAMETER));
            }
        }
        // close param list
        peek = this.tokenizer.peek();
        if (peek.type === 'RPAREN') {
            return new AST.ParameterList({
                openParenToken: tok,
                params,
                closeParenToken: this.tokenizer.next().value,
            });
        }
    }

    /**
     * Param ::= Type IDENT
     */
    acceptParam(tok) {
        const type = this.parseNextToken(t => this.acceptType(t), mess.INVALID_PARAMETER_TYPE);
        const identifierToken = this.expectNextToken('IDENT', mess.INVALID_PARAMETER_NAME);
        return new AST.Param({
            type,
            identifierToken,
        });
    }
}
