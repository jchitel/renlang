import { Token } from '../parser/Tokenizer';


/**
 * Base class for all AST nodes.
 * All the constructor does for now is assign all properties of the passed object onto itself,
 * and expect a children array to be passed.
 * In the future this class will contain definitions for visitor methods and other base functionality.
 * The children array must be an in-order array of tokens and sub-nodes.
 */
export default class ASTNode {
    constructor(properties, children) {
        Object.assign(this, properties);
        if (children) this.children = children;
    }

    /**
     * Extracts the AST as an tree object, where each node has two properties:
     * - type: the name of the ASTNode subclass of the instance
     * - children: an array of child nodes
     * Every node is either another tree node or a token, in which case it is a leaf.
     */
    toTree() {
        return {
            type: this.constructor.name,
            children: this.children
                .filter(c => c instanceof ASTNode || c instanceof Token)
                .map(c => (c instanceof ASTNode ? c.toTree() : { type: c.type, image: c.image })),
        };
    }

    registerLocation(key, value) {
        if (!this.locations) this.locations = {};
        this.locations[key] = value;
    }

    createAndRegisterLocation(key, start, end) {
        const location = {
            startLine: start.startLine,
            startColumn: start.startColumn,
            endLine: end.endLine,
            endColumn: end.endColumn,
        };
        this.registerLocation(key, location);
    }

    reduce() {
        throw new Error('Unimplemented method');
    }

    /**
     * This method is the meat of the type checking logic.
     * It is passed the type checker instance and containing module instance always,
     * if it is a statement it also receives a symbol table and the expected return type of the containing function.
     * If it is an expression it also receives a symbol table and the expected type of the expression (if any).
     * This method MUST set the type property of the node, and it MUST return that type (unless it is a statement).
     */
    resolveType() {
        throw new Error('Unimplemented method');
    }

    _createNewNode() {
        return Object.create(Object.getPrototypeOf(this));
    }
}
