import { Token } from './Tokenizer';


const _messages = {
    IMPORT_AFTER_DECL: 'Imports must occur before any declarations',
    INVALID_PROGRAM: (tok: Token) => `Expected import, export, or declaration, found '${tok.image}'`,
    EMPTY_FILE: 'Empty file',
    INVALID_IMPORT: 'Imports must be of the form `import from "<module>": <identifier>` or `import from "<module>" { <identifier>, ... }` or `import from "<module>" { <identifier> as <identifier>, ... }`',
    INVALID_IMPORT_MODULE: (tok: Token) => `Invalid module name; expected string literal, found '${tok.image}'`,
    IMPORT_NO_NEW_LINE: 'Imports must be followed by a new line or semicolon',
    INVALID_RETURN_TYPE: 'Invalid return type',
    INVALID_FUNCTION_NAME: (tok: Token) => `Invalid function name; expected identifier, found '${tok.image}'`,
    INVALID_PARAMETER_LIST: 'Invalid parameter list',
    INVALID_FAT_ARROW: (tok: Token) => `Expected '=>', found ${tok.image}`,
    INVALID_FUNCTION_BODY: 'Invalid function body',
    MISSING_CLOSE_PAREN: (tok: Token) => `Missing closing parenthesis, found '${tok.image}'`,
    INVALID_PARAMETER_TYPE: 'Invalid parameter type',
    INVALID_PARAMETER_NAME: (tok: Token) => `Invalid parameter name; expected identifier, found '${tok.image}'`,
    INVALID_EXPRESSION: 'Invalid expression',
    MISSING_CLOSE_BRACE: (tok: Token) => `Missing closing brace, found '${tok.image}'`,
    INVALID_FIELD_TYPE: 'Invalid field type',
    INVALID_FIELD_NAME: (tok: Token) => `Invalid field name; expected identifier, found '${tok.image}'`,
    STRUCT_FIELD_NO_NEW_LINE: 'Struct fields must be followed by a new line or semicolon',
    INVALID_TYPE: 'Invalid type',
    FUNCTION_TYPE_MISSING_COMMA: (tok: Token) => `Missing comma in function type, found '${tok.image}'`,
    FUNCTION_TYPE_MISSING_FAT_ARROW: (tok: Token) => `Missing token in function type; expected '=>', found '${tok.image}'`,
    FUNCTION_TYPE_INVALID_RETURN_TYPE: 'Invalid return type in function type',
    TUPLE_TYPE_MISSING_COMMA: (tok: Token) => `Missing comma in tuple type, found '${tok.image}'`,
    INVALID_TYPE_NAME: (tok: Token) => `Invalid type name; expected identifier, found '${tok.image}'`,
    TYPE_DECL_MISSING_EQUALS: (tok: Token) => `Invalid type declaration; expected '=', found '${tok.image}'`,
    INVALID_CONST_NAME: (tok: Token) => `Invalid constant name; expected identifier, found '${tok.image}'`,
    CONST_MISSING_EQUALS: (tok: Token) => `Invalid constant declaration; expected '=', found '${tok.image}'`,
    INVALID_DEFAULT_EXPORT_VALUE: 'Invalid default export value; must be function, type, or expression',
    INVALID_NAMED_EXPORT_VALUE: 'Invalid named export value; must be function, type, or expression',
    EXPORT_NO_NEW_LINE: 'Exports must be followed by a new line or semicolon',
    INVALID_EXPORT_DECLARATION: 'Invalid export declaration; must be of the form `export default <type|function|expression>` or `export <name> = <type|function|expression>`',
    INVALID_VAR_DECLARATION: 'Invalid variable declaration; must include initial value',
    INVALID_INITIAL_VALUE: 'Invalid initial value for variable declaration',
    INVALID_LAMBDA_EXPRESSION_MISSING_FAT_ARROW: (tok: Token) => `Invalid lambda expression; expected '=>', found '${tok.image}'`,
    INVALID_LAMBDA_EXPRESSION_BODY: 'Invalid lambda expression body',
    INVALID_LAMBDA_PARAM: 'Invalid lambda expression parameter',
    LAMBDA_MISSING_COMMA: (tok: Token) => `Invalid lambda expression; expected ',', found '${tok.image}'`,
    ARRAY_LITERAL_MISSING_COMMA: (tok: Token) => `Invalid array literal; expected ',', found '${tok.image}'`,
    STRUCT_LITERAL_MISSING_COMMA: (tok: Token) => `Invalid struct literal; expected ',', found '${tok.image}'`,
    STRUCT_LITERAL_MISSING_KEY: (tok: Token) => `Invalid struct literal key; expected identifier, found '${tok.image}'`,
    STRUCT_LITERAL_MISSING_COLON: (tok: Token) => `Invalid struct literal; expected ':', found '${tok.image}'`,
    TUPLE_LITERAL_MISSING_COMMA: (tok: Token) => `Invalid tuple literal; expected ',', found '${tok.image}'`,
    IF_MISSING_OPEN_PAREN: (tok: Token) => `Invalid if condition; expected '(', found '${tok.image}'`,
    IF_MISSING_CLOSE_PAREN: (tok: Token) => `Invalid if condition; expected ')', found '${tok.image}'`,
    IF_MISSING_ELSE: (tok: Token) => `Invalid if expression; expected 'else', found '${tok.image}'`,
    FUNCTION_APPLICATION_MISSING_COMMA: (tok: Token) => `Invalid function call; expected ',', found '${tok.image}'`,
    FIELD_ACCESS_INVALID_FIELD_NAME: (tok: Token) => `Invalid field access; expected identifier, found '${tok.image}'`,
    ARRAY_ACCESS_MISSING_CLOSE_BRACKET: (tok: Token) => `Invalid array access; expected ']', found '${tok.image}'`,
    INVALID_STATEMENT: 'Invalid statement',
    INVALID_TYPE_PARAM_LIST: 'Invalid type parameter list',
    INVALID_TYPE_PARAM: 'Invalid type parameter',
    INVALID_STRUCT_NO_CLOSE_BRACE: 'Invalid struct; missing required "}"',
    INVALID_TYPE_ARG_LIST: 'Invalid type argument list',
    INVALID_TYPE_ARG: 'Invalid type argument',
    INVALID_UNION_TYPE: 'Invalid union type',
    FOR_MISSING_OPEN_PAREN: 'Invalid for loop; missing required "("',
    FOR_MISSING_CLOSE_PAREN: 'Invalid for loop; missing required ")"',
    FOR_INVALID_ITER_IDENT: 'Invalid for loop; missing required identifier',
    FOR_MISSING_IN: 'Invalid for loop; missing required "in"',
    WHILE_MISSING_OPEN_PAREN: 'Invalid while loop; missing required "("',
    WHILE_MISSING_CLOSE_PAREN: 'Invalid while loop; missing required ")"',
    DO_WHILE_MISSING_WHILE: 'Invalid do-while loop; missing required "while"',
    TRY_CATCH_MISSING_CATCH: 'Invalid try-catch; missing required "catch" clause',
    TRY_CATCH_MISSING_OPEN_PAREN: 'Invalid try-catch; missing required "("',
    TRY_CATCH_MISSING_CLOSE_PAREN: 'Invalid try-catch; missing required ")"',
    CATCH_INVALID_PARAM: 'Invalid catch parameter',
};

type ParserMessage = string | ((t: Token) => string);

export type ParserMessageKey = keyof typeof _messages;

/**
 * Ideally, we would recursively define _messages above as:
 * 
 * ```ts
 * const messages: Record<keyof typeof messages, ParserMessage> = { ... }
 * ```
 * 
 * but sadly we aren't allowed to do that, so we use this intermediate value to handle this.
 * 
 * This means that adding a message above will be typesafe in the value (which will show up
 * as an error on the line below), and getting via getMessage() will be typesafe
 * in the key (which will show up as an error at the caller).
 */
const messages = _messages as Record<ParserMessageKey, ParserMessage>;
export function getMessage(key: ParserMessageKey, token?: Token) {
    const m = messages[key];
    const message = typeof m === 'string' ? m : token ? m(token) : null;
    if (!message) throw new Error('no token specified');
    return message;
}
