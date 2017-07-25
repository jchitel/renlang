import Tokenizer from './Tokenizer';
import LookaheadIterator from './LookaheadIterator';
import NewLineCheckIterator from './NewLineCheckIterator';
import * as AST from '../ast';
import ParserError from './ParserError';
import * as mess from './ParserMessages';


export default class Parser {
    parse(source) {
        // This is a triple-wrapped iterator:
        // 1. the tokenizer yields tokens one at a time
        // 2. the lookahead iterator allows us to peek at succeeding tokens without consuming them
        // 3. the new line check iterator filters new lines and adds a new line flag to each token preceding a new line
        this.tokenizer = new NewLineCheckIterator(new LookaheadIterator(new Tokenizer(source)));
        return this.acceptProgram();
    }

    acceptProgram() {
        const imports = [], functions = [], types = [], exports = [];
        for (const c of this.tokenizer) {
            let node;
            if (node = this.acceptImportDeclaration(c)) {
                if (functions.length || types.length) throw new ParserError(mess.IMPORT_AFTER_DECL, node.line, node.column);
                imports.push(node);
            //} else if (node = this.acceptFunctionDeclaration(c)) {
            //    functions.push(node);
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

    acceptImportDeclaration(tok) {
        // this cannot be an import if the first token is not 'import'
        if (tok.type !== 'IMPORT') return false;
        // `from <string_literal>`
        const fromToken = this.tokenizer.next().value;
        if (fromToken.type !== 'FROM') throw new ParserError(mess.INVALID_IMPORT, fromToken.startLine, fromToken.startColumn);
        const moduleNameToken = this.tokenizer.next().value;
        if (moduleNameToken.type !== 'STRING_LITERAL') throw new ParserError(mess.INVALID_IMPORT_MODULE(moduleNameToken), moduleNameToken.startLine, moduleNameToken.startColumn);

        const next = this.tokenizer.next().value;
        if (next.type === 'COLON') {
            // colon means default import
            const defaultImportNameToken = this.tokenizer.next().value;
            if (defaultImportNameToken.type !== 'IDENT') throw new ParserError(mess.INVALID_IMPORT, defaultImportNameToken.startLine, defaultImportNameToken.startColumn);
            if (!defaultImportNameToken.hasNewLine) throw new ParserError(mess.IMPORT_NO_NEW_LINE, defaultImportNameToken.endLine, defaultImportNameToken.endColumn);
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
            if (namedImportCloseBraceToken.type !== 'RBRACE') throw new ParserError(mess.INVALID_IMPORT, namedImportCloseBraceToken.startLine, namedImportCloseBraceToken.startColumn);
            if (!namedImportCloseBraceToken.hasNewLine) throw new ParserError(mess.IMPORT_NO_NEW_LINE, namedImportCloseBraceToken.endLine, namedImportCloseBraceToken.endColumn);
            return new AST.ImportDeclaration({
                importToken: tok,
                fromToken,
                moduleNameToken,
                namedImportOpenBraceToken: next,
                importComponents,
                namedImportCloseBraceToken,
                defaultImport: false,
            })
        } else {
            throw new ParserError(mess.INVALID_IMPORT, next.startLine, next.startColumn);
        }
    }

    acceptImportComponent(tok, first) {
        let commaToken = undefined;
        // a comma must separate each import name, so it will come before all but the first name
        if (!first) {
            if (tok.type !== 'COMMA') throw new ParserError(mess.INVALID_IMPORT, tok.startLine, tok.startColumn);
            commaToken = tok;
            tok = this.tokenizer.next().value;
        }
        if (tok.type !== 'IDENT') throw new ParserError(mess.INVALID_IMPORT, tok.startLine, tok.startColumn);
        if (this.tokenizer.peek().type === 'AS') {
            const asToken = this.tokenizer.next().value;
            const importAliasToken = this.tokenizer.next().value;
            if (importAliasToken.type !== 'IDENT') throw new ParserError(mess.INVALID_IMPORT, importAliasToken.startLine, importAliasToken.startColumn);
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
}
