import { FilePosition, FileRange, CoreObject } from '~/core';


/**
 * Categorizes tokens by syntactic type
 */
export enum TokenType {
    NONE = 1,          // default
    COMMENT,           // characters ignored from code
    IDENT,             // identifier
    RESERVED,          // reserved word
    INTEGER_LITERAL,   // integer number literals
    FLOAT_LITERAL,     // floating-point number literals
    STRING_LITERAL,    // character string literals
    CHARACTER_LITERAL, // single character literals
    OPER,              // operators
    SYMBOL,            // any special syntactic symbols
    WHITESPACE,        // any non-new-line whitespace (spaces, tabs, etc.)
    NEWLINE,           // \r\n and \n, has syntactic significance
    SEMI,              // semicolon, special delimiter that behaves as a new line
    EOF                // special end-of-file token
}

/**
 * Represents a single token extracted from the source string.
 * 'type' specifies what kind of terminal the token represents, and is used by the parser.
 * 'location' is the text range in the source file where the token is located
 * 'image' is an exact copy of the token from the original source string.
 * 'value' is an optional value that represents the parsed value of the token, if it makes sense for the token type (numbers, strings, etc.).
 */
export class Token extends CoreObject {
    readonly location: FileRange;

    constructor(
        readonly type: TokenType,
        position: FilePosition,
        readonly image: string,
        readonly value?: string | number
    ) {
        super();
        this.location = position.computeRange(image);
    }

    toString() {
        return this.image;
    }
}
