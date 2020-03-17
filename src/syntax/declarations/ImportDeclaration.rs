use crate::parser::lexer::{ TokenType, Token };
use crate::syntax::environment::{ NodeBase, SyntaxType };
use crate::parser::{ ParseFunc, seq, tok, select, repeat };
use crate::core::FileRange;


/**
 * NameAlias ::= IDENT 'as' IDENT
 */
pub const parse_name_alias: ParseFunc<Import> = seq(
    tok(TokenType.IDENT),
    tok("as"),
    tok(TokenType.IDENT),
    |(import_name, _, alias_name)| { Import { import_name, alias_name } }
);

/**
 * WildcardImport ::= '*' 'as' IDENT
 */
const parse_wildcard_import: ParseFunc<Import> = seq(
    tok("*"),
    tok("as"),
    tok(TokenType.IDENT),
    |(import_name, _, alias_name)| { Import { import_name, alias_name } }
);

/**
 * NamedImports ::= LBRACE (AliasImport | IDENT | WildcardImport)+(sep COMMA) RBRACE
 */
const parse_named_imports: ParseFunc<Vec<Import>> = seq(
    tok("{"),
    repeat(select::<ImportOrToken>(
        parse_name_alias,
        tok(TokenType.IDENT),
        parse_wildcard_import
    ), '+', tok(',')),
    tok('}'),
    |(_, names, _)| { names.map(|n| { match n { Token => Import { import_name: n, alias_name: n }, n => n } }) }
);

/**
 * ImportList ::= NamedImports               # just named imports
 *              | IDENT COMMA NamedImports   # default and named imports
 *              | WildcardImport             # just wildcard import
 *              | IDENT COMMA WildcardImport # default and wildcard import
 *              | IDENT                      # just default import
 */
pub const parse_import_list: ParseFunc<Vec<Import>> = select<Vec<Import>>(
    parse_named_imports,
    seq(
        tok(TokenType.IDENT),
        tok(','),
        parse_named_imports,
        |(def, _, named)| { vec![default_import(def), ...named] }
    ),
    seq(parse_wildcard_import, |i| { vec![i] }),
    seq(
        tok(TokenType.IDENT),
        tok(','),
        parse_wildcard_import,
        |(def, _, wildcard)| { vec![default_import(def), wildcard] }
    ),
    seq(tok(TokenType.IDENT), |i| { vec![defaultImport(i)] })
);

struct Import {
    import_name: Token,
    alias_name: Token,
}

pub struct ImportDeclaration {
    location: FileRange,
    syntax_type: SyntaxType,
    module_name: Token,
    imports: Vec<Import>,
}

impl ImportDeclaration {
    pub fn new(location: FileRange, module_name: Token, imports: Vec<Import>) -> Self {
        ImportDeclaration {
            location,
            syntax_type: SyntaxType::ImportDeclaration,
            module_name,
            imports,
        }
    }

    pub fn accept<T, R = T>(&self, visitor: ImportDeclarationVisitor<T, R>, param: T) -> R {
        visitor.visit_import_declaration(self, param);
    }
}

impl NodeBase for ImportDeclaration {
    fn location(&self) -> FileRange { self.location }
    fn syntax_type(&self) -> SyntaxType { self.syntax_type }
}

pub trait ImportDeclarationVisitor<T, R = T> {
    fn visit_import_declaration(node: ImportDeclaration, param: T) -> R;
}

/**
 * ImportDeclaration ::= 'import' 'from' STRING_LITERAL ':' ImportList
 */
pub const parse_import_declaration: ParseFunc<ImportDeclaration> = seq(
    tok("import"),
    tok("from"),
    tok(TokenType.STRING_LITERAL),
    tok(":"),
    parse_import_list,
    |(_, _, module_name, _, imports), location| { ImportDeclaration::new(location, module_name, imports) }
);

fn default_import(token: Token) -> Import {
    Import {
        import_name: token.set("image", "default"),
        alias_name: token
    }
}
