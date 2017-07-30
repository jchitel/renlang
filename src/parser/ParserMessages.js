export const IMPORT_AFTER_DECL = 'Imports must occur before any declarations';
export const INVALID_PROGRAM = tok => `Expected import, export, or declaration, found '${tok.image}'`;
export const INVALID_IMPORT = 'Imports must be of the form `import from "<module>": <identifier>` or `import from "<module>" { <identifier>, ... }` or `import from "<module>" { <identifier> as <identifier>, ... }`';
export const INVALID_IMPORT_MODULE = tok => `Invalid module name; expected string literal, found '${tok.image}'`;
export const IMPORT_NO_NEW_LINE = 'Imports must be followed by a new line or semicolon';
export const INVALID_RETURN_TYPE = 'Invalid return type';
export const INVALID_FUNCTION_NAME = tok => `Invalid function name; expected identifier, found '${tok.image}'`;
export const INVALID_PARAMETER_LIST = 'Invalid parameter list';
export const INVALID_FAT_ARROW = tok => `Expected '=>', found ${tok.image}`;
export const INVALID_FUNCTION_BODY = 'Invalid function body';
export const MISSING_CLOSE_PAREN = tok => `Missing closing parenthesis, found '${tok.image}'`;
export const INVALID_PARAMETER_TYPE = 'Invalid parameter type';
export const INVALID_PARAMETER_NAME = tok => `Invalid parameter name; expected identifier, found '${tok.image}'`;
export const INVALID_EXPRESSION = 'Invalid expression';
export const MISSING_CLOSE_BRACE = tok => `Missing closing brace, found '${tok.image}'`;
export const INVALID_FIELD_TYPE = 'Invalid field type';
export const INVALID_FIELD_NAME = tok => `Invalid field name; expected identifier, found '${tok.image}'`;
export const STRUCT_FIELD_NO_NEW_LINE = 'Struct fields must be followed by a new line or semicolon';
export const INVALID_TYPE = 'Invalid type';
export const FUNCTION_TYPE_MISSING_COMMA = tok => `Missing comma in function type, found '${tok.image}'`;
export const FUNCTION_TYPE_MISSING_FAT_ARROW = tok => `Missing token in function type; expected '=>', found '${tok.image}'`;
export const FUNCTION_TYPE_INVALID_RETURN_TYPE = 'Invalid return type in function type';
export const TUPLE_TYPE_MISSING_COMMA = tok => `Missing comma in tuple type, found '${tok.image}'`;
export const INVALID_TYPE_NAME = tok => `Invalid type name; expected identifier, found '${tok.image}'`;
export const TYPE_DECL_MISSING_EQUALS = tok => `Invalid type declaration; expected '=', found '${tok.image}'`;
export const INVALID_DEFAULT_EXPORT_VALUE = 'Invalid default export value; must be function, type, or expression';
export const INVALID_NAMED_EXPORT_VALUE = 'Invalid named export value; must be function, type, or expression';
export const EXPORT_NO_NEW_LINE = 'Exports must be followed by a new line or semicolon';
export const INVALID_EXPORT_DECLARATION = 'Invalid export declaration; must be of the form `export default <type|function|expression>` or `export <name> = <type|function|expression>`';
export const INVALID_VAR_DECLARATION = 'Invalid variable declaration; must include initial value';
export const INVALID_INITIAL_VALUE = 'Invalid initial value for variable declaration';
export const INVALID_LAMBDA_EXPRESSION_MISSING_FAT_ARROW = tok => `Invalid lambda expression; expected '=>', found '${tok.image}'`;
export const INVALID_LAMBDA_EXPRESSION_BODY = 'Invalid lambda expression body';
export const INVALID_LAMBDA_PARAM = 'Invalid lambda expression parameter';
export const LAMBDA_MISSING_COMMA = tok => `Invalid lambda expression; expected ',', found '${tok.image}'`;
export const ARRAY_LITERAL_MISSING_COMMA = tok => `Invalid array literal; expected ',', found '${tok.image}'`;
export const STRUCT_LITERAL_MISSING_COMMA = tok => `Invalid struct literal; expected ',', found '${tok.image}'`;
export const STRUCT_LITERAL_MISSING_KEY = tok => `Invalid struct literal key; expected identifier, found '${tok.image}'`;
export const STRUCT_LITERAL_MISSING_COLON = tok => `Invalid struct literal; expected ':', found '${tok.image}'`;
export const TUPLE_LITERAL_MISSING_COMMA = tok => `Invalid tuple literal; expected ',', found '${tok.image}'`;
export const IF_MISSING_OPEN_PAREN = tok => `Invalid if condition; expected '(', found '${tok.image}'`;
export const IF_MISSING_CLOSE_PAREN = tok => `Invalid if condition; expected ')', found '${tok.image}'`;
export const IF_MISSING_ELSE = tok => `Invalid if expression; expected 'else', found '${tok.image}'`;
export const FUNCTION_APPLICATION_MISSING_COMMA = tok => `Invalid function call; expected ',', found '${tok.image}'`;
export const FIELD_ACCESS_INVALID_FIELD_NAME = tok => `Invalid field access; expected identifier, found '${tok.image}'`;
export const ARRAY_ACCESS_MISSING_CLOSE_BRACKET = tok => `Invalid array access; expected ']', found '${tok.image}'`;
export const INVALID_STATEMENT = 'Invalid statement';
