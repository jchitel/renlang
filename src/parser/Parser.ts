import Tokenizer, { Token } from './Tokenizer';
import LazyList from './LazyList';
import ParserError from './ParserError';
import { AnyCSTNode, ICSTSubTree, CSTChildNode } from '../syntax/CSTNode';


/**
 * SEQUENTIAL MODE
 * This is the basic mode of the parser, it simply parses expansion components in sequence.
 * This mode can potentially branch to repetition mode for one or more components.
 * The basic process is this:
 * - for each component definition:
 * - if repetitive, enter repetition mode and add the returned components as defined
 * - otherwise, branch the parser and parse the definition normally
 * - if not accepted, fail only if the component was not optional, otherwise ignore it
 * - if accepted, save the tokenizer state, process additional flags, and save the accepted node
 * - return a new node containing all accepted nodes as children
 * 
 * REPETITION MODE
 * This is a sub-mode of sequential mode that allows components to be repeatedly parsed.
 * Process:
 * - Loop infinitely
 * - Branch the parser and parse the definition
 * - If not accepted, fail only if the item was preceded by a separator or this is the first item of a oneOrMore definition
 * - If not accepted otherwise, return items parsed so far as a success
 * - If accepted, save the new item and the parser state
 * - If there was a separator, branch and parse it
 * - If not accepted, return items parsed so far as a success
 * - If accepted, save the separator and parser state
 * - Repeat until a failure or a successful completion
 */
export interface ParserComponentSequentialDef<T> extends ParserComponentBaseDef {
    name: keyof T;
    definite?: boolean;
    mess?: ParserMessage;
    oneOrMore?: boolean;
    zeroOrMore?: boolean;
    sep?: {
        name: string;
        type?: string;
        image?: string;
        definite?: boolean;
    };
}

/**
 * CHOICE MODE
 * Choice mode is the other primary mode, which parses each provided item as a choice until one is accepted.
 * The first accepted choice is used as the result, and no successful choices is treated as a failure.
 * Process:
 * - Repeat for each choice
 * - Branch the parser in soft mode, parse the choice
 * - If accepted, save the parser state and create a node containing the successful node, then break
 * - If not accepted, ignore and try the next choice
 * - Once all are attempted, if there is not an accepted result, return false
 * - If the choice is non-left recursive, return the current result as a success
 * - Otherwise branch into left-recursive mode and return that result
 */
interface ParserComponentBaseDef {
    type?: string;
    image?: string;
    parse?(parser: Parser): AnyCSTNode;
    optional?: boolean;
}

/**
 * LEFT-RECURSIVE MODE
 * This mode is a branch of choice mode, which allows certain suffixes to follow a "base" node.
 * This process follows a similar process to choice mode:
 * - Enter infinite loop
 * - Enter a loop for each suffix choice
 * - Branch the parser in soft mode, parse the suffix
 * - If accepted, use the result to create a wrapper node around the current base, this is the new base
 * - Restart the inner loop
 * - If we go through all suffixes without a success, break out and return the current base
 */
interface ParserComponentLeftRecursiveDef {
    bases: ParserComponentBaseDef[];
    suffixes: ParserComponentSuffixDef[];
}

interface ParserComponentSuffixDef extends ParserComponentBaseDef {
    baseName: string;
}

/**
 * THE ENGINE OF THE PARSER
 * The parser runs off of a configuration for each non-terminal in the grammar.
 *
 * Here are the options we require:
 * - 'name': specifies the field name on the resulting AST node object
 * - either 'type', 'image', or 'parse':
 *   - 'type' and 'image' are the corresponding fields on tokens used to check for terminals
 *   - 'parse' specifies a non-terminal parse function
 *
 * Here are the fields that are required to appear in the defs list somewhere in specific situations:
 * - 'definite': specifies the component which, when parsed, means that this expansion is the correct path chosen.
 *   - If, until this point, we have been parsing softly, we can consume all softly parsed tokens
 *   - After this point, if a token does not match, it is an actual error
 *   - This option must appear on AT LEAST ONE component of a sequential expansion, and cannot appear on any choice expansions
 * - 'mess': In the event of an error on this component, throw an error with this message or message generator function
 * - 'choices': Specifies a choice expansion, where each child is checked in order until one is matched definitely
 * - 'leftRecursive': A special kind of choice expansion where there are at least one left-recursive choices
 *   - 'bases': The list of non-left-recursive choices, which are normal choices
 *   - 'suffixes': The list of left-recursive choices, which should only parse the suffix of the choice, ignoring the left-recursive part
 *     - 'baseName': The name of the field in the left-recursive AST object that should be used for the prefix portion
 *
 * Here are optional fields:
 * - 'optional': specifies that this component is optional.
 *   - The component MUST be parsed softly, and in the event of a failure, it should be skipped
 * - 'zeroOrMore' or 'oneOrMore': specifies that this component can be repeated.
 *   - Either one or the other can appear, but not both.
 *   - 'zeroOrMore' means that the component can appear 0 or more times, and 'oneOrMore' means 1 or more times
 *   - In the event of oneOrMore, parse one instance of the component as if it were non-optional, then proceed to the repetition phase
 *   - In the repetition phase, parse softly, skipping the component and continuing in the event of a failure
 * - 'sep': specifies for a repeated component another component that must separate each instance
 *   - Obviously, this can only appear alongside 'zeroOrMore' and 'oneOrMore'
 *   - After each repeated instance, one of these MUST be parsed softly.
 *   - In the event of a failure parsing the separator, the entire repetition is broken out of
 *   - In the event of a success parsing the separator, the next instance MUST be parsed definitely
 */
export default class Parser {
    public soft: boolean;
    public tokenizer: LazyList<Token>;
    private debug: boolean;
    private indent: number;

    constructor(source: string, debug: boolean = false) {
        // start with 'soft' as false because Program is implicitly definite
        this.soft = false;
        // This is a double-wrapped iterator:
        // 1. the tokenizer yields tokens one at a time
        // 2. the lookahead iterator allows us to peek at succeeding tokens without consuming them
        this.tokenizer = new LazyList(new Tokenizer(source));
        // debug flag (ONLY FOR TESTING)
        this.debug = debug;
        this.indent = 0;
    }

    /**
     * Copies this instance's fields onto a new instance of copy, changing the value of 'soft' to the one provided
     */
    private withSoft(soft: boolean) {
        return Object.assign<Parser>(Object.create(Object.getPrototypeOf<Parser>(this)), {
            ...(this as Parser),
            soft
        });
    }

    /**
     * In the event of a parse failure, one of three things will happen:
     * - we are parsing softly, in which case it is a soft failure and we should reset any peeked tokens and return false
     * - we are parsing definitely but there is no message available, in which case we return false and let the parent take care of the message
     * - we are parsing definitely, in which case we assemble an error and throw it
     */
    private processParseFailure(msg: ParserMessage | undefined, node: Token): false {
        if (this.soft || !msg) return false;
        throw new ParserError(createMessage(msg, node), node.line, node.column);
    }

    /**
     * Attempts to accept the next sequence according to the specified def and parser state.
     * Returns a tuple array containing [the next token or node, a flag indicating if the accept was successful]
     */
    private acceptUsingDef(def: ParserComponentBaseDef): [CSTChildNode, boolean] {
        const subParser = this.withSoft(def.optional || this.soft);
        if (def.type || def.image) {
            const tok = subParser.getNextToken();
            const accepted = !!(def.type && (tok.type === def.type) || def.image && (def.image === tok.image));
            this.tokenizer = subParser.tokenizer;
            return [tok, accepted];
        } else if (def.parse) {
            const node = def.parse(subParser);
            this.tokenizer = subParser.tokenizer;
            return [node, !!node];
        } else {
            throw new Error('this should never happen');
        }
    }

    /**
     * Gets the next token from the parser, taking into account the soft flag.
     */
    private getNextToken() {
        const [next, newTokenizer] = this.tokenizer.shift();
        this.tokenizer = newTokenizer;
        return next;
    }

    /**
    * Given a definite flag, change the parser state if it is true
    */
    private processDefiniteFlag(definite: boolean | undefined) {
        if (!definite) return;
        this.soft = false;
        this.printDebug('definite flag present, soft mode turned off');
    }

    public accept<T extends AnyCSTNode>(defs: ParserComponentSequentialDef<T>[], clss: Class<T>): T {
        const node = this._accept(defs, clss);
        if (!node) throw new Error('false bubbled to top');
        return node;
    }

    /**
     * Accept basic sequential def
     */
    private _accept<T extends AnyCSTNode>(defs: ParserComponentSequentialDef<T>[], clss: Class<T>) {
        this.printDebug('accept()', defs, clss);
        this.printDebug('entering sequential mode');
        // make sure that there is a definite flag on at least one component
        checkForDefinite(defs);
        const comps: ICSTSubTree = {}, children: CSTChildNode[] = [];
        for (const def of defs) {
            this.printDebug('NEW SEQUENTIAL DEF', def);
            if (def.oneOrMore || def.zeroOrMore) {
                // repetitive component
                this.printDebug('entering repetition mode');
                const [accepted, items, seps] = this.acceptRepetition(def);
                if (!accepted) return null;
                // if success, the tokenizer state has already been saved, save the items
                comps[def.name] = items;
                if (def.sep) comps[def.sep.name] = seps;
                children.push(...interleave(items, seps));
            } else {
                // normal
                this.printDebug('normal component');
                const subParser = this.withSoft(this.soft);
                const [node, accepted] = subParser.acceptUsingDef(def);
                if (!accepted) {
                    // if it was optional, ignore the failure and move on, otherwise fail
                    this.printDebug('COMPONENT NOT ACCEPTED', node);
                    if (!def.optional) {
                        this.printDebug('FAIL');
                        return this.processParseFailure(def.mess, node as Token);
                    } else this.printDebug('WAS OPTIONAL, IGNORING');
                } else {
                    // success, save tokenizer
                    this.printDebug('ITEM ACCEPTED', node);
                    this.tokenizer = subParser.tokenizer;
                    this.processDefiniteFlag(def.definite);
                    children.push(comps[def.name] = node);
                }
                this.printDebug('comps:', comps, 'children:', children);
            }
        }
        this.printDebug('DONE WITH SEQUENTIAL EXPANSION');
        return new clss(comps, children);
    }

    /**
     * Repetition mode
     */
    private acceptRepetition<T extends AnyCSTNode>(def: ParserComponentSequentialDef<T>): [boolean, CSTChildNode[], CSTChildNode[]] {
        const items = [], seps = [];
        let wasSeparator = false;
        let handleOneOrMore = !!def.oneOrMore;
        // enter repetition loop
        while (true) {
            const soft = (!handleOneOrMore && !wasSeparator) || this.soft;
            const subParser = this.withSoft(soft);
            const [node, accepted] = subParser.acceptUsingDef(def);
            if (!accepted) {
                this.printDebug('ITEM NOT ACCEPTED', node);
                if (wasSeparator || handleOneOrMore) {
                    // actual failure
                    this.printDebug('BUT WAS REQUIRED, FAIL');
                    return [this.processParseFailure(def.mess, node as Token), [], []];
                } else {
                    // this is fine, we just finish repetition
                    this.printDebug('COMPLETED REPETITION', 'items:', items, 'seps:', seps);
                    return [true, items, seps];
                }
            }
            this.printDebug('ITEM ACCEPTED', node);
            // after the first iteration this should always be false
            handleOneOrMore = false;
            // success, save tokenizer
            this.tokenizer = subParser.tokenizer;
            this.processDefiniteFlag(def.definite);
            items.push(node);
            this.printDebug('items parsed so far', items);
            if (def.sep) {
                // handle separator if there is one
                this.printDebug('parsing separator', def.sep);
                const sepParser = this.withSoft(true);
                const [sep, sepAccepted] = sepParser.acceptUsingDef(def.sep);
                if (!sepAccepted) {
                    // this is fine, we just finish repetition
                    this.printDebug('SEPARATOR NOT ACCEPTED, COMPLETING REPETITION', 'items:', items, 'seps:', seps);
                    return [true, items, seps];
                } else {
                    // save separator
                    this.printDebug('SEPARATOR ACCEPTED', sep);
                    this.tokenizer = sepParser.tokenizer;
                    this.processDefiniteFlag(def.definite);
                    seps.push(sep);
                    this.printDebug('separators parsed so far', seps);
                    wasSeparator = true;
                }
            }
        }
    }

    public acceptOneOf<T extends AnyCSTNode>(choices: ParserComponentBaseDef[], clss: Class<T>): T {
        const node = this._acceptOneOf<T>(choices, clss);
        if (!node) throw new Error('false bubbled to top');
        return node;
    }

    /**
     * Choice mode
     */
    private _acceptOneOf<T extends AnyCSTNode>(choices: ParserComponentBaseDef[], clss: Class<T>) {
        let base;
        this.printDebug('normal choice mode');
        for (const choice of choices) {
            this.printDebug('new choice', choice);
            const subParser = this.withSoft(true);
            try {
                const [node, accepted] = subParser.acceptUsingDef(choice);
                if (accepted) {
                    this.printDebug('CHOICE ACCEPTED', node);
                    this.tokenizer = subParser.tokenizer;
                    base = new clss({ choice: node }, [node]);
                    this.printDebug('created base', base);
                    break;
                }
            } catch (ignored) {} // error means it failed, but we don't care in this case
        }
        // no match, failure
        if (!base) {
            this.printDebug('NO BASE, FAIL');
            return false;
        }
        this.printDebug('DONE WITH CHOICE EXPANSION');
        return base;
    }

    public acceptLeftRecursive<T extends AnyCSTNode>(def: ParserComponentLeftRecursiveDef, clss: Class<T>): T {
        const node = this._acceptLeftRecursive(def, clss);
        if (!node) throw new Error('false bubbled to top');
        return node;
    }

    /**
     * Left recursive mode
     */
    private _acceptLeftRecursive<T extends AnyCSTNode>(def: ParserComponentLeftRecursiveDef, clss: Class<T>) {
        let base = this._acceptOneOf(def.bases, clss);
        if (!base) return false;
        this.printDebug('ENTERING LEFT-RECURSIVE MODE');
        retry: while (true) {
            this.printDebug('starting suffix loop');
            if (!def.suffixes) throw new Error('No suffixes found');
            for (const suff of def.suffixes) {
                this.printDebug('new suffix', suff);
                const subParser = this.withSoft(true);
                const suffNode = suff.parse && suff.parse(subParser);
                if (suffNode) {
                    this.printDebug('SUFFIX ACCEPTED', suffNode);
                    suffNode.subtree[suff.baseName] = base;
                    suffNode.children.unshift(base);
                    this.tokenizer = subParser.tokenizer;
                    base = new clss({ choice: suffNode }, [suffNode]);
                    this.printDebug('new base', base);
                    continue retry;
                }
            }
            break;
        }
        this.printDebug('DONE WITH LEFT-RECURSIVE EXPANSION');
        return base;
    }

    /**
     * Used to add debug statements to the parser logic, because this crap is hard to debug.
     * This will only print if the 'debug' flag is set on the parser
     */
    private printDebug(...things: any[]) {
        /* eslint-disable no-console */
        if (!this.debug) return;
        if (things[0] === 'accept()') this.indent++;
        console.log(`${' '.repeat(this.indent * 4)}Parser: soft:`, this.soft, ', next token: ', JSON.stringify(this.tokenizer.peek()));
        for (const thing of things) {
            console.log(`${' '.repeat(this.indent * 4)}DEBUG: `, typeof thing === 'string' ? thing : typeof thing === 'function' ? `function ${thing.name}` : thing === undefined ? 'undefined' : JSON.stringify(thing));
        }
        /* eslint-enable no-console */
    }
}

declare function formatMessage(t: Token): string;
type ParserMessage = string | (typeof formatMessage);
/**
 * Creates a message from either a string or a function
 */
function createMessage(message: ParserMessage, tok: Token) {
    return (typeof message === 'string') ? message : message(tok);
}

/**
 * This will be a common source of bugs, so we run a check for it for every sequential expansion
 */
function checkForDefinite(defs: ParserComponentSequentialDef<any>[]) {
    if (defs.some(d => !!(d.definite || d.sep && d.sep.definite))) return;
    throw new Error('No definite set on a sequential expansion');
}

/**
 * Given an arbitrary number of lists of nodes, interleave them, starting with the first item of the first list.
 * Continue filling the combined list with available items from each list until all lists are empty.
 */
function interleave(...lists: CSTChildNode[][]) {
    const combined = [];
    const max = Math.max(...lists.map(l => l.length));
    for (let i = 0; i < max; ++i) {
        for (const list of lists) if (list[i]) combined.push(list[i]);
    }
    return combined;
}
