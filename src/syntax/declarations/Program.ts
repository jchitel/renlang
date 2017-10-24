import { ASTNode, CSTNode } from '../Node';
import { Token } from '../../parser/Tokenizer';
import { STImportDeclaration, ImportDeclaration } from './ImportDeclaration';
import { FunctionDeclaration, STFunctionDeclaration } from './FunctionDeclaration';
import { TypeDeclaration, STTypeDeclaration } from './TypeDeclaration';
import { ExportDeclaration, STExportDeclaration } from './ExportDeclaration';


export class Program extends ASTNode {
    imports: ImportDeclaration[];
    functions: FunctionDeclaration[] = [];
    types: TypeDeclaration[] = [];
    exports: ExportDeclaration[] = [];
}

export class STProgram extends CSTNode<Program> {
    imports: STImportDeclaration[];
    declarations: STDeclaration[];
    eof: Token;

    reduce() {
        const node = new Program();
        node.imports = this.imports.map(i => i.reduce());
        const decls = this.declarations.map(d => d.reduce());
        for (const d of decls) {
            if (d instanceof FunctionDeclaration) {
                node.functions.push(d);
            } else if (d instanceof TypeDeclaration) {
                node.types.push(d);
            } else {
                node.exports.push(d);
            }
        }
        return node;
    }
}

export class STDeclaration extends CSTNode<FunctionDeclaration | TypeDeclaration | ExportDeclaration> {
    function: STFunctionDeclaration;
    typeNode: STTypeDeclaration;
    export: STExportDeclaration;

    reduce(): FunctionDeclaration | TypeDeclaration | ExportDeclaration {
        if (this.function) return this.function.reduce();
        else if (this.typeNode) return this.typeNode.reduce();
        else if (this.export) return this.export.reduce();
        else throw new Error("This shouldn't happen");
    }
}
