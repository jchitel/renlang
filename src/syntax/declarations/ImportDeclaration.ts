import { TokenType, Token } from '~/parser/lexer';
import { NodeBase, SyntaxType } from '~/syntax/environment';
import { ParseFunc, seq, tok, select, repeat } from '~/parser/parser';


/**
 * NameAlias ::= IDENT 'as' IDENT
 */
export const NameAlias: ParseFunc<Import> = seq(
    tok(TokenType.IDENT),
    tok('as'),
    tok(TokenType.IDENT),
    ([importName, _, aliasName]) => ({ importName, aliasName })
);

/**
 * WildcardImport ::= '*' 'as' IDENT
 */
const WildcardImport: ParseFunc<Import> = seq(
    tok('*'),
    tok('as'),
    tok(TokenType.IDENT),
    ([importName, _, aliasName]) => ({ importName, aliasName })
);

/**
 * NamedImports ::= LBRACE (AliasImport | IDENT | WildcardImport)+(sep COMMA) RBRACE
 */
const NamedImports: ParseFunc<Import[]> = seq(
    tok('{'),
    repeat(select<Import | Token>(
        NameAlias,
        tok(TokenType.IDENT),
        WildcardImport
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
export const ImportList: ParseFunc<Import[]> = select<Import[]>(
    NamedImports,
    seq(
        tok(TokenType.IDENT),
        tok(','),
        NamedImports,
        ([def, _, named]) => [defaultImport(def), ...named]
    ),
    seq(WildcardImport, i => [i]),
    seq(
        tok(TokenType.IDENT),
        tok(','),
        WildcardImport,
        ([def, _, wildcard]) => [defaultImport(def), wildcard]
    ),
    seq(tok(TokenType.IDENT), i => [defaultImport(i)])
);

interface Import {
    importName: Token;
    aliasName: Token;
}

export interface ImportDeclaration extends NodeBase<SyntaxType.ImportDeclaration> {
    readonly moduleName: Token;
    readonly imports: ReadonlyArray<Import>;
}

/**
 * ImportDeclaration ::= 'import' 'from' STRING_LITERAL ':' ImportList
 */
export const ImportDeclaration: ParseFunc<ImportDeclaration> = seq(
    tok('import'),
    tok('from'),
    tok(TokenType.STRING_LITERAL),
    tok(':'),
    ImportList,
    ([_1, _2, moduleName, _3, imports], location) => ({
        syntaxType: SyntaxType.ImportDeclaration as SyntaxType.ImportDeclaration,
        location,
        moduleName,
        imports
    })
);

const defaultImport = (token: Token) => ({ importName: token.clone({ image: 'default' }), aliasName: token });
