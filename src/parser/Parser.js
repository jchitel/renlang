import Tokenizer from './Tokenizer';
import LookaheadIterator from './LookaheadIterator';
import * as AST from '../ast';


export default class Parser {
    parse(source) {
        this.tokenizer = new LookaheadIterator(new Tokenizer(source));
        return this.acceptProgram();
    }

    acceptProgram() {
        const imports = [], functions = [], types = [], exports = [];
        for (const [c] of this.tokenizer) {
            let node;
            if (node = this.acceptImportDeclaration(c)) {
                if (functions.length || types.length) throw new Error(`${node.location}: Imports must occur before any declarations.`);
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
                throw new Error(`${c.location}: Expected import, export, or declaration, found ${c.image}`);
            }
        }
        // empty program
        return new AST.Program();
    }

    acceptImportDeclaration(tok) {
        const [tok1, tok2] = this.tokenizer.peek(0, 2);
        if (tok.type !== 'IMPORT' || tok1.type !== 'FROM' || tok2.type !== 'STRING_LITERAL') return false;
        const moduleName = tok2.value;
        const tok3 = this.tokenizer.peek(2);
        if (tok3.type === 'COLON') {
            const tok4 = this.tokenizer.peek(3);
            if (tok4.type !== 'IDENT') return false;
            const names = { default: tok4.image };
            for (let i = 0; i < 4; ++i) this.tokenizer.next();
            return new AST.ImportDeclaration(moduleName, names);
        }
    }
}
