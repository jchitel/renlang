export const IMPORT_AFTER_DECL = 'Imports must occur before any declarations';
export const INVALID_PROGRAM = (tok) => `Expected import, export, or declaration, found '${tok.image}'`;
export const INVALID_IMPORT = 'Imports must be of the form `import from "<module>": <identifier>` or `import from "<module>" { <identifier>, ... }` or `import from "<module>" { <identifier> as <identifier>, ... }`';
export const IMPORT_NO_NEW_LINE = 'Imports must be followed by a new line or semicolon';
export const INVALID_RETURN_TYPE = 'Invalid return type';
export const INVALID_FUNCTION_NAME = (tok) => `Invalid function name; expected identifier, found '${tok.image}'`;
