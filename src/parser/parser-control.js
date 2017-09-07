import Tokenizer from './Tokenizer';
import LookaheadIterator from './LookaheadIterator';
import NewLineCheckIterator from './NewLineCheckIterator';
import ParserError from './ParserError';


/**
 * TODO CURRENT ISSUE:
 * Accept a type that is a function type with no parameters.
 * The type will iterate through the choices until function type, which is fine.
 * Function type starts parsing, and it isn't definite until the FAT_ARROW token, so it remains soft.
 * It parses the LPAREN and remains soft.
 * Then it expects a possible type, so it goes to accept a type.
 * When it is unable to find a type (because there is a RPAREN), it resets the peeked tokens. THIS IS WHERE THE PROBLEM OCCURS.
 * Because we have been soft since the beginning, it will reset to the very beginning, even though we've already parsed the LPAREN at the FunctionType level.
 * This causes it to start over with parsing type, which will parse FunctionType, and it will recurse forever until stack overflow.
 *
 * To resolve this, we need to introduce the concept of intermediate peek start points.
 * Rather than resetting to 0 whenever we fail a soft parse, we reset to the provided start point.
 * That way the parent can always pick up where it left off.
 * There is pretty much only one way to do this, by copying the current peeked location whenever we clone with a new soft value.
 * That way the parents' peeked value will be unaffected.
 * There will probably be more issues here but that's where you can start.
 */
export class Parser {
    constructor(source, debug = false) {
        // start with 'soft' as false because Program is implicitly definite
        this.soft = false;
        // persistent is for things that should be saved across all instances
        this.persistent = { peeked: 0 };
        // This is a triple-wrapped iterator:
        // 1. the tokenizer yields tokens one at a time
        // 2. the lookahead iterator allows us to peek at succeeding tokens without consuming them
        // 3. the new line check iterator filters new lines and adds a new line flag to each token preceding a new line
        this.tokenizer = new NewLineCheckIterator(new LookaheadIterator(new Tokenizer(source)));
        // debug flag (ONLY FOR TESTING)
        this.debug = debug;
        this.indent = 0;
    }

    /**
     * Copies this instance's fields onto a new instance of copy, changing the value of 'soft' to the one provided
     */
    withSoft(soft) {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), { ...this, soft });
    }

    /**
     * In the event of a parse failure, one of three things will happen:
     * - we are parsing softly, in which case it is a soft failure and we should reset any peeked tokens and return false
     * - we are parsing definitely but there is no message available, in which case we return false and let the parent take care of the message
     * - we are parsing definitely, in which case we assemble an error and throw it
     */
    processParseFailure(msg, node) {
        if (this.soft || !msg) {
            this.resetPeekedTokens();
            return false;
        }
        throw new ParserError(createMessage(msg, node), node.line, node.column);
    }

    /**
     * Attempts to accept the next sequence according to the specified def and parser state.
     * Returns a tuple array containing [the next token or node, a flag indicating if the accept was successful]
     */
    acceptUsingDef(def) {
        const subParser = this.withSoft(def.optional || this.soft);
        if (def.type || def.image) {
            const tok = subParser.getNextToken();
            const accepted = def.type && (tok.type === def.type) || def.image && (def.image === tok.image);
            return [tok, accepted];
        } else if (def.parse) {
            const node = def.parse(subParser);
            return [node, !!node];
        } else {
            throw new Error('this should never happen');
        }
    }

    /**
     * Gets the next token from the parser, taking into account the soft flag.
     */
    getNextToken() {
        if (this.soft) {
            const tok = this.tokenizer.peek(this.persistent.peeked);
            this.persistent.peeked++;
            return tok;
        }
        return this.tokenizer.next().value;
    }

    /**
     * Fast forwards the iteration of tokens to the current peeked location
     */
    consumePeekedTokens() {
        for (; this.persistent.peeked > 0; --this.persistent.peeked) this.tokenizer.next();
    }

    /**
     * Resets the peeking of tokens to the previously consumed point
     */
    resetPeekedTokens() {
        this.persistent.peeked = 0;
        this.printDebug('reset parser');
    }

    /**
    * Given a definite flag, change the parser state if it is true
    */
    processDefiniteFlag(definite) {
        if (!definite) return;
        this.soft = false;
        this.consumePeekedTokens();
        this.printDebug('consumed peeked tokens');
    }

    /**
     * Used to add debug statements to the parser logic, because this crap is hard to debug.
     * This will only print if the 'debug' flag is set on the parser
     */
    printDebug(...things) {
        if (!this.debug) return;
        if (things[0] === 'accept()') this.indent++;
        console.log(`${' '.repeat(this.indent * 4)}Parser: soft:`, this.soft, ', peeked tokens: ', this.persistent.peeked, ', next token: ', JSON.stringify(this.tokenizer.peek(this.persistent.peeked)));
        for (const thing of things) {
            console.log(`${' '.repeat(this.indent * 4)}DEBUG: `, typeof thing === 'string' ? thing : typeof thing === 'function' ? `function ${thing.name}` : thing === undefined ? 'undefined' : JSON.stringify(thing));
        }
    }
}

/**
 * THE ENGINE OF THE PARSER
 * So this function has to be huge because there is a ton of control flow logic here, unfortunately.
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
 *
 * Operation of the parser:
 * - So there are 4 "modes" of the parser:
 *   1. Sequential mode: parse expansion components in sequence
 *   2. Choice mode: parse choice expansions by trying each option separately until one works
 *   3. Left-recursive mode: same as choice mode, but check for left-recursive options after the non-left-recursive ones
 *   4. Repetition mode: same as sequential mode, but loop for components that can be repeated
 * - There is also a 'soft' flag in the parser to indicate whether tokens should be consumed or just peeked,
 *   and whether failures should simply return false or throw an error.
 *   Child components will inherit the parent's soft flag unless the parent overrides it.
 * - Sequential mode is default, each def is used to accept or reject the next sequence of n tokens.
 *   In the even of a failure, optional components are skipped, the soft flag will cause false to be returned, or an error will be thrown.
 *   A success will cause the parsed component to be queued for addition to the parent node.
 *   The 'definite' flag on a component will cause the soft flag to be turned off for the remainder of the parent's operation.
 *   Once each def is processed, the resulting enumerated children are used to create an instance of the provided AST node class.
 * - Choice mode is used if one def is provided with the 'choices' key.
 *   Each child choice is enumerated and accepted softly. A failure will cause the choice to be ignored.
 *   The first succcessful choice will be used as the resulting single child of the node.
 *   If none succeed, false is returned so the parent can handle the error accordingly.
 * - Left-recursive mode is used if one def is provided with the 'leftRecursive' key.
 *   The 'bases' key under that will be treated the same as the 'choices' key.
 *   Once a base is chosen, the parser iterates all of the left-recursive suffixes repeatedly
 *   until it reaches an iteration where none of the suffixes succeed.
 *   Each successful suffix wraps the previous base as the new base.
 *   Once that loop exits, the resulting base is the parse result.
 *   Any failed suffix parse is ignored.
 * - Repetition mode is used as a sub-mode of sequential mode if a component has the oneOrMore or zeroOrMore flags.
 *   The definition is accepted repeatedly until it fails, after which all successful parses are grouped into
 *   a list and used as the resulting child. A oneOrMore flag will treat the first repeated item as required.
 *   If the component also specifies a 'sep' key, that value will be parsed as a separator which must be
 *   found between each repetition. If a separator is parsed, the next item is required.
 *   If a separator is not parsed, another item cannot follow and the component will be finished.
 */
export default function accept(parser, defs, clss) {
    parser.printDebug('accept()', defs, clss);
    parser.printDebug((defs[0].choices || defs[0].leftRecursive) ? 'entering choice mode' : 'entering sequential mode');
    if (!defs[0].choices && !defs[0].leftRecursive) {
        // sequence expansion, process each def in order
        checkForDefinite(defs);
        const comps = {}, children = [];
        sequentialLoop: for (const def of defs) {
            parser.printDebug('NEW SEQUENTIAL DEF', def);
            // check for repetitive components
            if (def.oneOrMore || def.zeroOrMore) {
                parser.printDebug('entering repetition mode');
                // repetitive components are organized into a list, with separators put into a list as well (if used)
                const list = [], seps = [];
                // this flag indicates if there was a separator prior, in which case the next item is required
                let wasSep = false;
                // this flag indicates that it is a oneOrMore repetition where the first item is required
                let handleFirst = !!def.oneOrMore;
                // enter repetition mode
                while (true) {
                    // use soft if: 1) handleFirst and wasSep are both false (this item isn't required), or 2) the parser is already soft
                    const soft = (!handleFirst && !wasSep) || parser.soft;
                    const [node, accepted] = parser.withSoft(soft).acceptUsingDef(def);
                    if (!accepted) {
                        parser.printDebug('item not accepted', node);
                        if (wasSep || handleFirst) {
                            parser.printDebug('expected item here, FAIL');
                            return parser.processParseFailure(def.mess, node);
                        } else {
                            // item wasn't required, just leave the def
                            parser.printDebug('no more items, leaving def');
                            comps[def.name] = list;
                            children.push(...interleave(list, seps));
                            parser.resetPeekedTokens();
                            parser.printDebug('comps:', comps, 'children:', children);
                            continue sequentialLoop;
                        }
                    }
                    parser.printDebug('item accepted', node);
                    // after the first iteration this should always be false
                    handleFirst = false;
                    parser.processDefiniteFlag(def.definite);
                    list.push(node);
                    parser.printDebug('items parsed so far', list);
                    if (def.sep) {
                        parser.printDebug('parsing separator', def.sep);
                        // if there is a separator, parse for it
                        const [sep, accepted] = parser.withSoft(true).acceptUsingDef(def.sep);
                        if (!accepted) {
                            parser.printDebug('separator not accepted, leaving def', sep);
                            // no separator, repetition has to stop here
                            comps[def.name] = list;
                            comps[def.sep.name] = seps;
                            children.push(...interleave(list, seps));
                            parser.resetPeekedTokens();
                            parser.printDebug('comps:', comps, 'children:', children);
                            continue sequentialLoop;
                        } else {
                            parser.printDebug('separator accepted', sep);
                            parser.processDefiniteFlag(true);
                            seps.push(sep);
                            parser.printDebug('separators parsed so far', seps);
                            wasSep = true;
                        }
                    }
                }
            } else {
                parser.printDebug('non-repeated def');
                // Sequential mode
                const [node, accepted] = parser.acceptUsingDef(def);
                if (!accepted) {
                    parser.printDebug('item not accepted', node);
                    // no match, if optional, skip it, if soft or no message, return false, otherwise throw an error
                    if (def.optional) {
                        parser.printDebug('optional item, leaving def');
                        parser.resetPeekedTokens();
                        continue;
                    }
                    parser.printDebug('expected item, FAIL');
                    return parser.processParseFailure(def.mess, node);
                }
                parser.printDebug('item accepted', node);
                parser.processDefiniteFlag(def.definite);
                // add that component
                children.push(comps[def.name] = node);
                parser.printDebug('comps:', comps, 'children:', children);
            }
        }
        parser.printDebug('DONE with sequential expansion');
        return new clss(comps, children);
    } else {
        // Choice mode and left-recursive mode
        let base;
        parser.printDebug(defs[0].choices ? 'normal choice mode' : 'left-recursive mode');
        const choices = defs[0].choices || defs[0].leftRecursive.bases;
        for (const choice of choices) {
            parser.printDebug('NEW CHOICE', choice);
            const [node, accepted] = parser.withSoft(true).acceptUsingDef(choice);
            if (!accepted) {
                parser.printDebug('choice not accepted, skipping', node);
                parser.resetPeekedTokens();
                continue;
            }
            parser.printDebug('choice accepted', node);
            base = new clss({ [choice.name]: node }, [node]);
            parser.printDebug('created base', base);
            parser.consumePeekedTokens();
            break;
        }
        // if there was no match, the expansion faile
        if (!base) parser.printDebug('no base, FAIL');
        if (!base) return false;
        // if this was not left-recursive, we're done
        if (defs[0].choices) parser.printDebug('DONE with choice expansion');
        if (defs[0].choices) return base;
        // Enter left-recursive mode
        parser.printDebug('entering left-recursive mode');
        recursiveRetryLoop: while (true) {
            parser.printDebug('starting retry loop');
            for (const suff of defs[0].leftRecursive.suffixes) {
                parser.printDebug('NEW SUFFIX', suff);
                const suffNode = suff.parse(parser.withSoft(true));
                if (suffNode) {
                    parser.printDebug('suffix accepted', suffNode);
                    // suffix matched, add the current base to the suffix node, wrap the suffix node
                    suffNode[suff.baseName] = base;
                    suffNode.children.unshift(base);
                    base = new clss({ [suff.name]: suffNode }, [suffNode]);
                    parser.printDebug('new base', base);
                    parser.consumePeekedTokens();
                    // try again
                    continue recursiveRetryLoop;
                } else {
                    parser.printDebug('suffix not accepted, skipping');
                    parser.resetPeekedTokens();
                }
            }
            // we've gone a whole iteration with no matches, break out of the loop
            break;
        }
        parser.printDebug('DONE with left-recursive expansion, final base:', base);
        return base;
    }
}

/**
 * Creates a message from either a string or a function
 */
function createMessage(message, tok) {
    return (typeof message === 'string') ? message : message(tok);
}

/**
 * This will be a common source of bugs, so we run a check for it for every sequential expansion
 */
function checkForDefinite(defs) {
    if (defs.some(d => d.definite || d.sep && d.sep.definite)) return;
    throw new Error('No definite set on a sequential expansion');
}

/**
 * Given an arbitrary number of lists of nodes, interleave them, starting with the first item of the first list.
 * Continue filling the combined list with available items from each list until all lists are empty.
 */
function interleave(...lists) {
    const combined = [];
    const max = Math.max(...lists.map(l => l.length));
    for (let i = 0; i < max; ++i) {
        for (const list of lists) if (list[i]) combined.push(list[i]);
    }
    return combined;
}