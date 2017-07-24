export const IMPORT_AFTER_DECL = 'Imports must occur before any declarations';
export const INVALID_PROGRAM = (tok) => `Expected import, export, or declaration, found '${tok.image}'`;
export const INVALID_IMPORT = 'Imports must be of the form `import from "<module>": <identifier>` or `import from "<module>" { <identifier>, ... }` or `import from "<module>" { <identifier> as <identifier>, ... }`';
