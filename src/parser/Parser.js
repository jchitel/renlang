import Tokenizer from './Tokenizer';
import * as AST from '../ast';


export default class Parser {
    parse(source) {
        this.tokenizer = new Tokenizer(source);
        return this.acceptProgram();
    }

    acceptProgram() {
        // This is the only point where whitespace will be checked BEFOREHAND.
        // In ALL other instances, whitespace should be consumed AFTER an expansion is accepted.
        this.tokenizer.consumeWhiteSpace();
        const imports = [];
        let _import;
        while (_import = this.acceptImportDeclaration()) imports.push(_import);
    }

    acceptImportDeclaration() {
        const tokens = [this.tokenizer.getStaticToken('import')];
        if (!tokens[0]) return false;
        // TODO: you were here
        if (!this.tokenizer.consumeWhiteSpace()) return false;
        if (!this.tokenizer.getStaticToken('from')) return false;
        this.tokenizer.consumeWhiteSpace();
        const moduleName = this.tokenizer.getStringLiteral();
        if (!moduleName) return false;
        this.tokenizer.consumeWhiteSpace();
        if (this.tokenizer.getStaticToken(':', 'colon')) {
            this.tokenizer.consumeWhiteSpace();
            const defaultName = this.tokenizer.getIdent();
            if (!defaultName) return false;
            if (!this.tokenizer.consumeWhiteSpace(true)) return false;
            return new AST.ImportDeclaration()
        }
    }
}
