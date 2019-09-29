import { TokenType, Token } from '~/parser/lexer';
import { NodeBase, SyntaxType } from '~/syntax/environment';
import { ParseFunc, seq, tok, select, repeat } from '~/parser/parser';
import { FileRange } from '~/core';


/**
 * NameAlias ::= IDENT 'as' IDENT
 */
export const parseNameAlias: ParseFunc<Import> = seq(
    tok(TokenType.IDENT),
    tok('as'),
    tok(TokenType.IDENT),
    ([importName, _, aliasName]) => ({ importName, aliasName })
);

/**
 * WildcardImport ::= '*' 'as' IDENT
 */
const parseWildcardImport: ParseFunc<Import> = seq(
    tok('*'),
    tok('as'),
    tok(TokenType.IDENT),
    ([importName, _, aliasName]) => ({ importName, aliasName })
);

/**
 * NamedImports ::= LBRACE (AliasImport | IDENT | WildcardImport)+(sep COMMA) RBRACE
 */
const parseNamedImports: ParseFunc<Import[]> = seq(
    tok('{'),
    repeat(select<Import | Token>(
        parseNameAlias,
        tok(TokenType.IDENT),
        parseWildcardImport
    ), '+', tok(',')),
    tok('}'),
    ([_1, names, _2]) => names.map(n => n instanceof Token ? { importName: n, aliasName: n } : n)
);

/**
 * ImportList ::= NamedImports               # just named imports
 *              | IDENT COMMA NamedImports   # default and named imports
 *              | WildcardImport             # just wildcard import
 *              | IDENT COMMA WildcardImport # default and wildcard import
 *              | IDENT                      # just default import
 */
export const parseImportList: ParseFunc<Import[]> = select<Import[]>(
    parseNamedImports,
    seq(
        tok(TokenType.IDENT),
        tok(','),
        parseNamedImports,
        ([def, _, named]) => [defaultImport(def), ...named]
    ),
    seq(parseWildcardImport, i => [i]),
    seq(
        tok(TokenType.IDENT),
        tok(','),
        parseWildcardImport,
        ([def, _, wildcard]) => [defaultImport(def), wildcard]
    ),
    seq(tok(TokenType.IDENT), i => [defaultImport(i)])
);

interface Import {
    importName: Token;
    aliasName: Token;
}

export class ImportDeclaration extends NodeBase<SyntaxType.ImportDeclaration> {
    constructor(
        location: FileRange,
        readonly moduleName: Token,
        readonly imports: ReadonlyArray<Import>
    ) { super(location, SyntaxType.ImportDeclaration) }

    accept<T, R = T>(visitor: ImportDeclarationVisitor<T, R>, param: T): R {
        return visitor.visitImportDeclaration(this, param);
    }
}

export interface ImportDeclarationVisitor<T, R = T> {
    visitImportDeclaration(node: ImportDeclaration, param: T): R;
}

/**
 * ImportDeclaration ::= 'import' 'from' STRING_LITERAL ':' ImportList
 */
export const parseImportDeclaration: ParseFunc<ImportDeclaration> = seq(
    tok('import'),
    tok('from'),
    tok(TokenType.STRING_LITERAL),
    tok(':'),
    parseImportList,
    ([_1, _2, moduleName, _3, imports], location) => new ImportDeclaration(location, moduleName, imports)
);

const defaultImport = (token: Token): Import => ({ importName: token.set('image', 'default'), aliasName: token });
