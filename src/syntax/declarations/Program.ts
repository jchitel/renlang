import { Token, TokenType } from '~/parser/Tokenizer';
import ASTNode from '~/syntax/ASTNode';
import INodeVisitor from '~/syntax/INodeVisitor';
import { parser, nonTerminal } from '~/parser/Parser';
import { ImportDeclaration } from './ImportDeclaration';


@nonTerminal({ abstract: true })
export abstract class NonImportDeclaration extends ASTNode {}

@nonTerminal({ abstract: true, implements: NonImportDeclaration })
export abstract class Declaration extends NonImportDeclaration {
    abstract name: string;
}

/**
 * Program ::= ImportDeclaration* NonImportDeclaration* EOF
 */
export class Program extends ASTNode {
    @parser(ImportDeclaration, { repeat: '*', definite: true })
    setImports(value: ImportDeclaration[]) {
        this.imports = value;
    }

    @parser(NonImportDeclaration, { repeat: '*', definite: true })
    setDeclarations(value: NonImportDeclaration[]) {
        this.declarations = value;
    }

    @parser(TokenType.EOF, { definite: true }) setEof(_value: Token) {}

    imports: ImportDeclaration[] = [];
    declarations: NonImportDeclaration[] = [];

    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitProgram(this);
    }
}
