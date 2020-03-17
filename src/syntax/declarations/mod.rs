pub use import_declaration::ImportDeclaration;
pub use constant_declaration::{ConstantDeclaration, AnonymousConstantDeclaration};
pub use export_declaration::ExportDeclaration;
pub use export_forward_declaration::ExportForwardDeclaration;
pub use type_declaration::{TypeDeclaration, TypeParam, AnonymousTypeDeclaration};
pub use function_declaration::{FunctionDeclaration, Param, AnonymousFunctionDeclaration};
pub use namespace_declaration::{NamespaceDeclaration, AnonymousNamespaceDeclaration};

mod import_declaration {
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
    }

    impl Syntax for ImportDeclaration {
        fn non_terminal(parser: Parser) -> ParseFunc<ImportDeclaration> {
            parser.non_terminal(parse_import_declaration)
        }
    }

    fn parse_import_declaration() -> ParseResult<ImportDeclaration> {
        let (_, _, module_name, _, imports) = seq(
            tok("import"),
            tok("from"),
            tok(TokenType.STRING_LITERAL),
            tok(":"),
            parse_import_list,
            |(_, _, module_name, _, imports), location| { ImportDeclaration::new(location, module_name, imports) }
        );
        ImportDeclaration::new(location, module_name, imports)
    }
}
