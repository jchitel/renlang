import { TokenType } from './Tokenizer';
import { ParserMessageKey } from './ParserMessages';
import Parser, { ParseNode } from './Parser';
import ASTNode from '~/syntax/ASTNode';


/**
 * A parse expression is an element of a non-terminal expansion,
 * and is a key component of defining a grammar.
 * A parse expression can be one of five things:
 * - a token type (for parsing a specific token type)
 * - a token image (for parsing a specific token image)
 * - an ASTNode subclass (for parsing a formal non-terminal)
 * - a ParseSequence (for parsing an informal non-terminal)
 * - an array of any of the above four (for parsing one of a list of choices)
 */
export type ParseExpression = ArrayOrSingle<TokenType | string | Class<ASTNode> | ParseSequence>;

export class ParseExpressionInstance {
    tokenType?: TokenType;
    tokenImage?: string;
    nonTerminal?: Class<ASTNode>;
    choices?: ParseExpressionInstance[];
    sequence?: ParseSequence;

    repeat?: '+' | '*';
    optional?: true;
    definite?: true;
    flatten?: true;
    sep?: ParseExpressionInstance;
    err?: ParserMessageKey;

    constructor(expression: ParseExpression | ParseExpressionInstance, options: ParseOptions = {}) {
        if (expression instanceof ParseExpressionInstance) {
            return Object.assign(this, expression);
        }
        this.repeat = options.repeat;
        this.optional = options.optional;
        this.definite = options.definite;
        this.flatten = options.flatten;
        this.err = options.err;
        if (options.sep) this.sep = new ParseExpressionInstance(options.sep, options.sepOptions);

        if (Array.isArray(expression)) {
            this.choices = expression.map(e => new ParseExpressionInstance(e));
        } else if (typeof expression === 'number') {
            this.tokenType = expression;
        } else if (typeof expression === 'string') {
            this.tokenImage = expression;
        } else if (typeof expression === 'function') {
            this.nonTerminal = expression;
        } else if (expression) {
            this.sequence = expression;
        } else {
            throw new Error('falsy expression passed to constructor');
        }
    }

    hasNonTerminal(cls: Function) {
        return this.nonTerminal === cls;
    }

    /**
     * This is the main "switching" logic for all types of expressions.
     * If you want to parse an arbitrary expression, call this.
     */
    parse(parser: Parser): ParseNode {
        if (this.tokenType) {
            return parser.parseTokenType(this.tokenType);
        } else if (this.tokenImage) {
            return parser.parseTokenImage(this.tokenImage);
        } else if (this.nonTerminal) {
            return parser.parseNonTerminal(this.nonTerminal);
        } else if (this.sequence) {
            return parser.parseSequence(this.sequence);
        } else if (this.choices) {
            return parser.parseChoices(this.choices);
        } else {
            throw new Error('never');
        }
    }
}

/**
 * This is the base configuration for defining a parser.
 * - repeat: either + (one or more) or * (zero or more) indicating that the parsed
 *   element can be repeated.
 *   - sep: If repeat is specified, 'sep' can also be specified to indicate that
 *     a token must be used to separate repeated elements.
 * - definite: indicates the "choosing point" for a non-terminal. If the parse fails
 *   at or before this element, it will move to the next choice if one exists. If it
 *   fails after, it will be a hard failure.
 * - flatten: for nested ParserDefs, this indicates that the fields inside this parsed
 *   element should be moved up to the parent element, for convenience.
 * - err: if this is specified and the parse fails, this message or function will be used
 *   to create an error message for the failed element.
 */
export interface ParseOptions {
    repeat?: '+' | '*',
    optional?: true,
    definite?: true,
    flatten?: true,
    sep?: ParseExpression,
    sepOptions?: { definite?: true },
    err?: ParserMessageKey,
}

/**
 * This is used only with the 'parse' option of a ParserDef, when a nested
 * definition is going to be used. This definition can be either an object
 * of key-value pairs or a list of such objects (for a choice definition).
 */
export type ParseSequence = {
    [key: string]: ParseExpression | ParseExpressionInstance;
}