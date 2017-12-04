import ASTNode from '~/syntax/ASTNode';
import LazyList from './LazyList';
import Tokenizer, { Token, TokenType } from './Tokenizer';
import ParserError from './ParserError';
import { ParserMessageKey, getMessage } from './ParserMessages';
import { ParseExpression, ParseOptions, ParseSequence, ParseExpressionInstance } from './ParseExpression';


/**
 * Shorthand function for creating a new parse expression with options.
 * 
 * NOTE: this will return a ParseExpressionInstance, which is not exposed to
 * logic external to the parser.
 */
export function exp(expression: ParseExpression, opts: ParseOptions = {}): ParseExpressionInstance {
    return new ParseExpressionInstance(expression, opts);
}

/**
 * When a nested parse is used, this is the object that is returned.
 */
export type ParseResult = {
    [key: string]: ArrayOrSingle<ParseNode>;
}

/** Parse results that contain sub-nodes */
type ParseParentNode = ASTNode | ParseResult;
/** All Parse results */
export type ParseNode = ParseParentNode | Token;

/**
 * A Parser can perform a high-level parse operation.
 * Its intended usage is to simply create it with a source code string
 * and parse a specific ASTNode subclass, as shown here:
 * ```ts
 * class Program extends ASTNode { ... }
 * const source = 'my program\'s code';
 * const parsed = new Parser(source).parse(Program);
 * ```
 * 
 * ## Ren Parser
 * 
 * ### Grammar Definition Overview
 * 
 * The grammar logic is defined in each ASTNode subclass using a set of decorators and functions:
 * - @parser(expression, options?): defines a method of the class as the target for the parse
 *   result of a specific expression of the sequence defined by the class. More info below.
 * - @nonTerminal(options): defines additional attributes onto an ASTNode class, primarily
 *   related to non-terminal inheritance. More info below.
 * - exp(expression, options?): creates a parse expression exactly the same way as @parser,
 *   but for a value not tied to an ASTNode class. This is usefulf for defining ParseSequences.
 * 
 * ### Context Free Grammars
 * 
 * This parser logic is based on core concepts of Context Free Grammars, with additional sugar
 * that makes it much easier to describe a grammar in code with little overhead.
 * 
 * A Context Free Grammar (CFG) is composed of a list of "expansions", where an expansion is
 * of the form:
 * ```
 * Non-Terminal ::= <sequence of terminals or non-terminals>
 * ```
 * 
 * #### Non-Terminals (Syntax Tree Nodes)
 * 
 * A non-terminal is a symbol that "expands" to one or more sequences of terminal symbols
 * or other non-terminal symbols. The tree-like structure of a program comes from
 * these non-terminals. Each non-terminal is a node in a "syntax tree", and the expanded
 * sequence is its children. The term "AST node" can also be used to mean "non-terminal",
 * and in fact the ASTNode class is used to represent non-terminals in Ren's parser.
 * 
 * Examples of non-terminals:
 * - programs
 * - declarations
 * - types
 * - expressions
 * - statements
 * 
 * #### Terminals (Tokens)
 * 
 * A terminal is called so because it cannot be expanded, it is a concrete unit of code.
 * It is called so because expansion "terminates" at terminals; likewise, non-terminals
 * are called so because they do not "terminate" expansion. Terminals are the leaf nodes
 * of the syntax tree. If you take all of the leaf nodes of the syntax tree from left to
 * right and arrange them in a flat list, you've reproduced the original source code.
 * The word "token" can also be used to mean "terminal", and in fact the Token class is
 * used to represent terminals in Ren's parser.
 * 
 * Examples of terminals:
 * - identifiers (abc, _myVar123, etc.)
 * - literals (1, 1.5, "hello world", etc.)
 * - symbols (+, -, etc.)
 * 
 * ### Grammar Definition
 * 
 * In this parser, expansions can be thought of as the "definition" of non-terminals.
 * The primary way to define a non-terminal is by creating a sub-class of the ASTNode
 * class, which is the abstract parent class of all formal non-terminals in Ren.
 * These classes can contain any fields required to logically represent the node's
 * purpose in the program. To define an expansion on the class, you add methods to the class
 * annotated with the @parser decorator. The first parameter of this decorator is the
 * "parse expression" represented by this element of the expansion. There are five types
 * of parse expressions:
 * - token types
 * - token images
 * - non-terminal class references
 * - in-place sequences
 * - choices
 * See below for more info on Parse Expressions.
 * 
 * The second parameter of @parser is an optional object of options for the expression.
 * These options are:
 * - definite: if true, this expression is the expansion's "decision point", meaning
 *   that if the parser is parsing this non-terminal as optional or a choice, this
 *   expression is the point where the parser should start to fail if it hits any
 *   further failures. This will become more clear with the Soft Mode section below.
 * - optional: if true, this expression should be skipped if it fails
 * - repeat: either '+' or '*', if specified this expression will be repeatedly parsed
 *   into a list until the first failure. '+' means there must be at least one, and '*'
 *   means there can be zero or more. The 'sep' option can be used with this to specify
 *   an expression that should appear between each repetition as a "separator". The
 *   'sepOptions' option can be used to specify the separator as 'definite'.
 * - err: this can be a ParserMessageKey, and when specified, the corresponding message
 *   will be used to assemble an error in the instance of this expression's failed parse
 *   (assuming the parser is currently in hard mode).
 * 
 * The target of @parser must be a method that takes one of five parameters:
 * - a Token: if the expression is a TokenType or a token image
 * - an ASTNode subclass instance: if the expression is an ASTNode subclass
 * - a ParseResult: if the expression is an in-place sequence
 * - a union of any of the above: if the expression is a choice
 * - a list of any of the above: if the expression had a 'repeat' option
 *   (the list of separators will also be passed as a second parameter if 'sep' was specified)
 * 
 * Upon successful parse of the expression, this method is invoked with the result.
 * It is **not** invoked if the expression is optional and fails to parse.
 * 
 * This method is intended to take the parse result and perform any additional processing
 * or transformation to map it to the class's semantic properties.
 * 
 * NOTE: the methods should be put into the correct order of the expansion. The parser
 * is dependent on this.
 * 
 * ### Parse Expressions
 * 
 * #### Terminal Expressions
 * 
 * Token types and images are ways to specify terminals in an expansion. There is a
 * specific set of token types that you can use (see `enum TokenType` in ~/parser/Tokenizer),
 * and you can also specify a specific token image (the source string of the token)
 * to parse. Specifying one of these tells the parser to get the next token and compare
 * its type or image to parse it.
 * 
 * #### Non-Terminal Expressions
 * 
 * The remaining three expression types are ways to specify a non-terminal in an expansion.
 * You can provide another ASTNode class reference, specifying that the parser should
 * attempt to expand that non-terminal once it reaches that point. You can also specify
 * an in-place ParseSequence, which is another way to define a non-terminal (described below).
 * And you can specify a list of other expressions as choices, which the parser will iterate through
 * until it reaches its first successful option, returning that one.
 * 
 * ##### Parse Sequences
 * 
 * Sometimes, it can be cumbersome to define non-terminal classes when those non-terminals
 * might only be used for the parsing process and discarded afterward. Examples of this are
 * definitions with complex syntax that require several nested non-terminals.
 * 
 * In these instances, you can create in-place sequences, which are parsed the same way as
 * non-terminal classes, but the result is a simple JS object that is ultimately passed to
 * an actual non-terminal method. Sequences are defined as JS objects, where the keys
 * will be the keys of the parsed result, and the values are parse expressions. These
 * expressions are defined in the exact same way as @parser(), but using the exp() function
 * instead. If the expression has no options, the call to exp() can be omitted.
 * Just like with @parser() methods, these keys must be ordered correctly for the parser
 * to work properly.
 * 
 * Parse sequences can be nested, allowing you to define very complex grammars in a concise
 * manner. You can save sequences to variables so they can be reused in multiple places
 * as well. It is not recommended to use parse sequences outside of the parsing logic,
 * but there's nothing technically stopping you.
 * 
 * ### Non-terminal inheritance
 * 
 * When defining a complex grammar for a typical programming language, certain non-terminals
 * tend to emerge as "abstract" nodes. Examples of these are:
 * - Declaration (functions, types, etc.)
 * - Type (int, class, etc.)
 * - Expression (1+1, myFunc(), etc.)
 * - Statement (if (x) y else z, try {} catch () {}, etc.)
 * 
 * These can be represented using choices, but they typically end up mapping to an object-oriented
 * pattern of inheritance, in which there is an abstract parent class that doesn't know
 * what its subclasses are, and each of the subclasses knows what its superclass is.
 * This is the opposite of choice expressions, where instead the parent knows all of its
 * children, and the children don't know about the parent.
 * 
 * For these cases, where there is a single abstract parent extended by several different
 * types of children, we have a concept of "non-terminal inheritance". In this model,
 * each subclass is "registered" as one choice of an abstract non-terminal. When the abstract
 * non-terminal is parsed, the list of subclasses is used as the list of parse choices.
 * 
 * To specify a non-terminal as abstract or as an implementor of an abstract non-terminal,
 * use the @nonTerminal() decorator. These are the available options:
 * - abstract: if true, this class is marked as an abstract non-terminal. The class itself
 *   should also be abstract because it will never be instantiated, but it doesn't technically
 *   have to be.
 * - implements: should be a reference to an abstract class, this defines an inheritance relationship.
 *   The class itself should actually be a subclass of the abstract class, but it doesn't
 *   technically have to be.
 * - leftRecursive: if the subclass is left-recursive (its first expression is the same as its
 *   parent class), it must be defined as left-recursive to avoid infinite recursion in the parser.
 * - before: in the instance that one or more children of the same class contain the exact
 *   expansion of another child in their own expansion, there is a conflict. in these instances,
 *   the non-terminal with the longer expansion must come first. This option can be a list
 *   of non-terminal classes that this class must come before. If any of the items in the list
 *   are already present when this is registered, it will be inserted before all of them.
 */
export default class Parser {
    public soft: boolean;
    public tokenizer: LazyList<Token>;

    constructor(source: string) {
        // start with 'soft' as false because Program is implicitly definite
        this.soft = false;
        this.tokenizer = new LazyList(new Tokenizer(source));
    }

    /**
     * Top-level parser method. Call this with an AST node class to perform a parse of that class.
     * NOTE: this should **not** be called from within the parser's internals.
     */
    parse<T extends ASTNode>(cls: Class<T>): T {
        try {
            return this.parseNonTerminal(cls);
        } catch (err) {
            if (err instanceof SoftParserError) {
                throw new Error('an error occurred in the parser, a soft error was not converted to a hard error');
            }
            throw err;
        }
    }

    /**
     * Parse a token (terminal) by type
     */
    parseTokenType(type: TokenType) {
        const tok = this.getNextToken();
        if (tok.type !== type) throw new SoftParserError(tok);
        return tok;
    }

    /**
     * Parse a token (terminal) by image
     */
    parseTokenImage(image: string) {
        const tok = this.getNextToken();
        if (tok.image !== image) throw new SoftParserError(tok);
        return tok;
    }

    /**
     * Parse an instance of a non-terminal class.
     * NOTE: the 'cls' variable must be an ASTNode subclass,
     * but because some of these can be abstract classes,
     * it is not possible to represent these in TypeScript.
     */
    parseNonTerminal<T extends ASTNode>(cls: Class<T>): T {
        if (Reflect.has(cls, 'abstract') && Reflect.get(cls, 'abstract')) {
            // abstract node, parse all implementing classes as choices
            const cfg: decorators.AbstractNonTerminalConfig = Reflect.get(cls, 'abstract');
            if (cfg.suffixes.length === 0) return this.parseChoices(cfg.choices) as T;
            return this.parseLeftRecursive(cfg) as T;
        }
        // normal node, parse as sequence
        const entries = this.getEntries(cls);
        // invoke the actual constructor so that we get initializers
        return this.parseSequenceInternal(Reflect.construct(cls, []) as T, entries);
    }

    /**
     * Parse a sequence of parse expressions
     */
    parseSequence(seq: ParseSequence): ParseResult {
        const entries = Object.keys(seq).map(k => ({
            methodName: k,
            exp: new ParseExpressionInstance(seq[k])
        }));
        return this.parseSequenceInternal({} as ParseResult, entries);
    }

    /**
     * Parse a list of choices
     */
    parseChoices(choices: ParseExpressionInstance[]) {
        for (const choice of choices) {
            try {
                return this.forkAndParse(true, choice);
            } catch {} // with choices, we ignore **all** failures and just skip it
        }
        // no match, soft failure
        throw new SoftParserError();
    }

    /**
     * Parse a list of left-recursive choices
     */
    private parseLeftRecursive(cfg: decorators.AbstractNonTerminalConfig) {
        let base = this.parseChoices(cfg.choices) as ASTNode;
        retry: while (true) {
            for (const suff of cfg.suffixes) {
                try {
                    // suffixes must be non-terminal classes
                    const cls = suff.exp.nonTerminal!;
                    const suffNode = Reflect.construct(cls, []);
                    this.invokeSetter(suffNode, suff.baseName, false, base);
                    // do the parse
                    const subParser = this.withSoft(true);
                    subParser.parseSequenceInternal(suffNode, this.getEntries(cls));
                    this.tokenizer = subParser.tokenizer;
                    base = suffNode;
                    continue retry;
                } catch {} // with suffixes, we ignore **all** failures and just skip it
            }
            break;
        }
        return base;
    }

    private parseSequenceInternal<T extends ParseParentNode>(inst: T, entries: decorators.ParseEntry[]): T {
        // make sure there is a definite flag on at least one entry
        checkForDefinite(entries);
        for (const { methodName, exp } of entries) {
            // parse the expression
            const result = this.parseExpressionInternal(exp);
            if (Array.isArray(result)) this.invokeSetter(inst, methodName, exp.flatten, ...result);
            else if (result) this.invokeSetter(inst, methodName, exp.flatten, result);
        }
        return inst;
    }

    /**
     * This is the core parse logic. All expression modifiers are processed here.
     */
    private parseExpressionInternal(exp: ParseExpressionInstance) {
        if (exp.repeat) {
            // repetitions are handled a bit differently
            return this.parseRepetition(exp);
        }
        try {
            return this.forkAndParse(exp.optional || this.soft, exp);
        } catch (err) {
            // forward hard errors
            if (!(err instanceof SoftParserError)) throw err;
            // if it was optional, ignore the failure and move on, otherwise fail
            if (!exp.optional) this.processParseFailure(exp.err, err.token);
        }
        // We only get here if the expression was optional and not parsed, so undefined will be returned
    }

    /**
     * Repetition mode
     */
    private parseRepetition(exp: ParseExpressionInstance): [ParseNode[], Token[]] {
        const items: ParseNode[] = [], seps: Token[] = [];
        let wasSeparator = false; // flipped to true after every separator
        let handleOneOrMore = exp.repeat === '+'; // flipped to false after the first item
        // enter repetition loop
        while (true) {
            // the first of a "+" repetition, and the node after a separator, are both required
            const required = wasSeparator || handleOneOrMore;
            try {
                // accept node
                items.push(this.forkAndParse(this.soft || !required, exp));
                // after the first iteration this should always be false
                handleOneOrMore = false;
            } catch (err) {
                // hard error, forward the error
                if (!(err instanceof SoftParserError)) throw err;
                // node was required here, throw as a hard failure
                if (required) this.processParseFailure(exp.err, err.token);
                // this is fine, we just finish repetition
                return [items, seps];
            }
            if (exp.sep) {
                try {
                    // handle separator if there is one
                    seps.push(this.forkAndParse(true, exp.sep) as Token);
                    wasSeparator = true;
                } catch (err) {
                    if (!(err instanceof SoftParserError)) throw err;
                    // this is fine, we just finish repetition
                    return [items, seps];
                }
            }
        }
    }

    /**
     * To maintain proper immutable state, we create "sub-parsers"
     * that clone the soft flag and the tokenizer.
     * In the event of a failure, an exception will be thrown.
     * Otherwise, we copy the successful tokenizer and set soft to true
     * if there was a success
     */
    private forkAndParse(soft: boolean, exp: ParseExpressionInstance): ParseNode {
        const subParser = this.withSoft(exp.optional || soft);
        const result = exp.parse(subParser);
        // if we got here, node was accepted successfully, copy the tokenizer to the parent parser
        this.tokenizer = subParser.tokenizer;
        if (exp.definite) this.soft = false;
        return result;
    }
    
    /**
     * Gets the next token from the tokenizer, saving the resulting tokenizer.
     */
    private getNextToken() {
        const [next, newTokenizer] = this.tokenizer.shift();
        this.tokenizer = newTokenizer;
        return next;
    }

    /**
     * In the event of a successful parse of a sequence's child, we need to add the
     * result to the container object.
     */
    private invokeSetter(inst: ParseParentNode, name: string, flatten: boolean | undefined, ...values: any[]) {
        if (inst instanceof ASTNode) {
            // non-terminal instance
            const setter = Reflect.get(inst, name) as (...values: any[]) => void;
            setter.call(inst, ...values);
        } else {
            // nested parse, this is just a simple object
            if (values.length > 1) {
                // contains separators, apply each as a separate property, ignore flatten
                const items = values[0], seps = values[1];
                Object.assign(inst, { [name]: items, [`${name}_sep`]: seps });
            } else {
                // single value, flatten or assign
                const value = values[0];
                Object.assign(inst, flatten ? value : { [name]: value });
            }
        }
    }
    
    /**
     * Copies this instance's fields onto a new instance of copy, changing the value of 'soft' to the one provided
     */
    private withSoft(soft: boolean) {
        return Object.assign<Parser>(Object.create(Object.getPrototypeOf<Parser>(this)), {
            ...(this as Parser),
            soft,
        });
    }
    
    /**
     * In the event of a parse failure, one of three things will happen:
     * - we are parsing softly, in which case it is a soft failure and we should reset any peeked tokens and return false
     * - we are parsing definitely but there is no message available, in which case we return false and let the parent take care of the message
     * - we are parsing definitely, in which case we assemble an error and throw it
     */
    private processParseFailure(key: ParserMessageKey | undefined, node: Token | undefined): never {
        if (this.soft || !key) throw new SoftParserError(node);
        const tok = node as Token; // TODO what about when this isn't a token?
        throw new ParserError(getMessage(key, tok), tok.line, tok.column);
    }

    private getEntries(cls: Class<ASTNode>) {
        if (!Reflect.has(cls, 'parser')) throw new Error('AST node class requires at least one @parser() decorator on a method.');
        return Reflect.get(cls, 'parser') as decorators.ParseEntry[];
    }
}

/**
 * A soft parser error is how we represent a failure to parse a value
 * where that failure may not actually cause the parse to fail:
 * - an optional element
 * - a repeated element (as long as one isn't required at that location)
 * - a separator in a repetition
 * - a choice
 * - a left-recursive suffix
 */
class SoftParserError {
    token?: Token;

    constructor(token?: Token) {
        this.token = token;
    }
}

/**
 * This will be a common source of bugs, so we run a check for it for every sequential expansion
 */
function checkForDefinite(es: decorators.ParseEntry[]) {
    if (es.some(e => !!(e.exp.definite || e.exp.sep && e.exp.sep.definite))) return;
    throw new Error('No definite set on a sequential expansion');
}

namespace decorators {
    /**
     * When a ParserDef is stored on a class (using the 'parser' decorator)
     * the name of the decorated method needs to be stored too.
     */
    export interface ParseEntry {
        methodName: string;
        exp: ParseExpressionInstance;
    }

    /**
     * Decorator for a method that defines a parser definition for an AST class.
     * This decorator is required to define parser logic.
     */
    export function parser<T extends ASTNode>(e: ParseExpression, opts: ParseOptions = {}): MethodDecorator {
        return function(cls: T, key: string) {
            if (!Reflect.has(cls.constructor, 'parser')) Reflect.set(cls.constructor, 'parser', []);
            const parser = Reflect.get(cls.constructor, 'parser') as ParseEntry[];
            parser.push({ methodName: key, exp: new ParseExpressionInstance(e, opts) });
        }
    }

    /**
     * This is a configuration for defining a non-terminal.
     * This is not required for all non-terminals, only if non-terminal
     * inheritance is going to be used
     */
    interface NonTerminalDef {
        abstract?: boolean,
        implements?: Class<ASTNode>, // ideally this would be Class<ASTNode> but you can't pass abstract classes as classes
        leftRecursive?: string, // this is the name of the recursive field
        before?: Class<ASTNode>[], // list of classes that this class should come before in the registration list
    }

    export interface AbstractNonTerminalConfig {
        choices: ParseExpressionInstance[];
        suffixes: {
            baseName: string;
            exp: ParseExpressionInstance;
        }[];
    }

    /**
     * Decorator for an AST class that defines a non-terminal definition on it.
     * This is not required for all classes, just for defining inheritance relationships.
     */
    export function nonTerminal(def: NonTerminalDef): ClassDecorator {
        return function(cls: Class<ASTNode>) {
            if (def.abstract) {
                const cfg: AbstractNonTerminalConfig = { choices: [], suffixes: [] };
                Reflect.defineProperty(cls, 'abstract', { value: cfg });
            } else {
                // we need to do this because classes inherit the static properties of their parents
                Reflect.defineProperty(cls, 'abstract', { value: false });
            }
            if (def.implements) {
                if (!Reflect.has(def.implements, 'abstract')) throw new Error('Non-terminal cannot implement non-abstract non-terminal');
                const cfg: AbstractNonTerminalConfig = Reflect.get(def.implements, 'abstract');
                if (def.leftRecursive) {
                    const suffix = { baseName: def.leftRecursive, exp: new ParseExpressionInstance(cls) };
                    if (def.before) {
                        const indices = findIndices(cfg.suffixes, def.before, (s, c) => s.exp.hasNonTerminal(c));
                        if (indices.length) {
                            cfg.suffixes.splice(Math.min(...indices), 0, suffix);
                            return;
                        }
                    }
                    cfg.suffixes.push(suffix);
                } else {
                    const choice = new ParseExpressionInstance(cls);
                    if (def.before) {
                        const indices = findIndices(cfg.choices, def.before, (i, c) => i.hasNonTerminal(c));
                        if (indices.length) {
                            cfg.choices.splice(Math.min(...indices), 0, choice);
                            return;
                        }
                    }
                    cfg.choices.push(choice);
                }
            }
        }
    }

    /**
     * Searches a list for the indices of items in a "terms list" using a specified predicate function.
     * The resulting list is the list of indices of items in 'termsList' that were present in 'listToSearch'
     * according to the predicate.
     */
    function findIndices<T, T1>(listToSearch: T[], termsList: T1[], predicate: (t: T, t1: T1) => boolean) {
        return termsList
            .map(t1 => listToSearch.findIndex(t => predicate(t, t1)))
            .filter(i => i !== -1);
    }
}

export const parser = decorators.parser;
export const nonTerminal = decorators.nonTerminal;
