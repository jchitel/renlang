import { FilePosition, FileRange } from '~/core';


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
export interface Token {
    readonly type: TokenType;
    readonly location: FileRange;
    readonly image: string;
    readonly value?: any;
    toString(): string;
    with(props: Partial<Token>): Token;
}

/** Creates a new token */
export function Token(type: TokenType, position: FilePosition, image: string, value?: any): Token {
    return Token.create(type, position, image, value);
}

export namespace Token {
    const tokenSymbol = Symbol('Token');

    /** Creates a new token */
    export function create(type: TokenType, position: FilePosition, image: string, value?: any): Token {
        const token: Token = {
            type, image, value, location: position.computeRange(image),
            toString, with: _with,
        };
        // separate symbol assignment so that we catch excessive property errors above
        return { ...token, [tokenSymbol]: tokenSymbol } as Token;
    }

    /**
     * Creates a new token that has no type, useful for creating tokens after parsing is done
     * and types don't matter anymore.
     */
    export function fromLocation(position: FilePosition, image: string) {
        return create(TokenType.NONE, position, image);
    }

    /**
     * Determines if an object is a token.
     */
    export function isToken(token: {}): token is Token {
        return tokenSymbol in token;
    }

    function toString(this: Token) {
        return this.image;
    }

    function _with(this: Token, props: Partial<Token>) {
        return { ...this, ...props };
    }
}
