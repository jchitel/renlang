import { Location, Token, TokenType } from '~/parser/Tokenizer';
import ASTNode from '~/syntax/ASTNode';
import INodeVisitor from '~/syntax/INodeVisitor';
import { parser, exp, ParseResult } from '~/parser/Parser';


/**
 * NameAlias ::= IDENT 'as' IDENT
 */
export const NameAlias = {
    name: TokenType.IDENT,
    as: exp('as', { definite: true }),
    alias: exp(TokenType.IDENT, { err: 'INVALID_IMPORT' })
};

/**
 * WildcardImport ::= '*' 'as' IDENT
 */
const WildcardImport = {
    '*': exp('*', { definite: true }),
    as: 'as',
    alias: TokenType.IDENT,
};

/**
 * NamedImports ::= LBRACE (AliasImport | IDENT | WildcardImport)+(sep COMMA) RBRACE
 */
const NamedImports = {
    '{': exp(TokenType.LBRACE, { definite: true }),
    names: exp([NameAlias, TokenType.IDENT, WildcardImport], {
        repeat: '+',
        sep: TokenType.COMMA,
        err: 'INVALID_IMPORT'
    }),
    '}': exp(TokenType.RBRACE, { err: 'INVALID_IMPORT' })
};

/**
 * ImportList ::= NamedImports               # just named imports
 *              | IDENT COMMA NamedImports   # default and named imports
 *              | WildcardImport             # just wildcard import
 *              | IDENT COMMA WildcardImport # default and wildcard import
 *              | IDENT                      # just default import
 */
export const ImportList = [NamedImports, {
    defaultImport: TokenType.IDENT,
    ',': TokenType.COMMA,
    named: exp(NamedImports, { definite: true, flatten: true }),
}, WildcardImport, {
    defaultImport: TokenType.IDENT,
    ',': TokenType.COMMA,
    wildcard: exp(WildcardImport, { definite: true, flatten: true }),
}, {
    defaultImport: exp(TokenType.IDENT, { definite: true })
}];

/**
 * ImportDeclaration ::= 'import' 'from' STRING_LITERAL COLON ImportList
 */
export class ImportDeclaration extends ASTNode {
    @parser('import', { definite: true }) setImportToken() {}
    @parser('from', { err: 'INVALID_IMPORT' }) setFromToken() {}

    @parser(TokenType.STRING_LITERAL, { err: 'INVALID_IMPORT_MODULE' })
    setModuleName(token: Token) {
        this.moduleName = token.value;
        this.registerLocation('moduleName', token.getLocation());
    }

    @parser(TokenType.COLON, { err: 'INVALID_IMPORT' }) setColonToken() {}
    
    @parser(ImportList, { err: 'INVALID_IMPORT' })
    setImports(imports: ParseResult) {
        if (imports.defaultImport instanceof Token) {
            const defaultImport = imports.defaultImport as Token;
            this.addImport('default', defaultImport.getLocation(), defaultImport.image, defaultImport.getLocation());
        }
        if (imports['*'] instanceof Token) {
            const w = imports['*'] as Token, a = imports.alias as Token;
            this.addImport('*', w.getLocation(), a.image, a.getLocation());
        }
        if (Array.isArray(imports.names)) {
            for (const i of imports.names as (ParseResult | Token)[]) {
                const [importName, aliasName] = (i instanceof Token) ? [i, i]
                    : (i.name) ? [i.name as Token, i.alias as Token]
                    : [i['*'] as Token, i.alias as Token];
                this.addImport(importName.image, importName.getLocation(), aliasName.image, aliasName.getLocation());
            }
        }
    }

    moduleName: string;
    imports: {
        importName: string,
        importLocation: Location,
        aliasName: string,
        aliasLocation: Location,
    }[] = [];
    
    visit<T>(visitor: INodeVisitor<T>): T {
        return visitor.visitImportDeclaration(this);
    }
    
    private addImport(importName: string, importLocation: Location, aliasName: string, aliasLocation: Location) {
        this.imports.push({ importName, importLocation, aliasName, aliasLocation });
    }
}
