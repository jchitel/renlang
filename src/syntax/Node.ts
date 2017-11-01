import { Token, ILocation } from '../parser/Tokenizer';
import { TType } from '../typecheck/types';
import INodeVisitor from './INodeVisitor';


export interface ICSTSubTree {
    [component: string]: CSTChildNode | CSTChildNode[];
}

interface ICSTSimple {
    type: string;
    children: (ICSTSimple[] | ICSTSimple | { type: string, image: string })[];
}

export type CSTChildNode = AnyCSTNode | Token;

export type AnyCSTNode = CSTNode<any>;

/**
 * Base class for all CST (Concrete Syntax Tree) nodes.
 * The children array must be an in-order array of tokens and sub-nodes.
 * 
 * A "Concrete Syntax Tree" is a tree containing the raw parse result,
 * including ALL expanded non-terminals and ALL tokens.
 * The original source code can be produced from the CST.
 * Before doing further operations on the tree (such as type checking or IR transformation)
 * it is reduced to an equivalent Abstract Syntax Tree, or "AST" (see below).
 *
 * Because these classes are only used in the context of parsing and syntax,
 * and because AST nodes will share the same name, these classes should be
 * prefixed with "ST" to distinguish them.
 * 
 * The "ReduceType" parameter is the type that is returned from the CST node's
 * reduce() method.
 */
export abstract class CSTNode<ReduceType> {
    children: CSTChildNode[];
    subtree: ICSTSubTree;

    constructor(properties: ICSTSubTree, children: CSTChildNode[]) {
        this.subtree = properties;
        this.children = children;
    }
    
    /**
     * Extracts the AST as an tree object, where each node has two properties:
     * - type: the name of the ASTNode subclass of the instance
     * - children: an array of child nodes
     * Every node is either another tree node or a token, in which case it is a leaf.
     */
    toTree(): ICSTSimple {
        return {
            type: this.constructor.name,
            children: this.children
                .filter(c => c instanceof CSTNode || c instanceof Token)
                .map(c => {
                    if (Array.isArray(c)) {
                        return c.map(_c => _c.toTree());
                    } else if (c instanceof CSTNode) {
                        return c.toTree();
                    } else {
                        return { type: c.type, image: c.image };
                    }
                }),
        };
    }
    
    /**
     * All CST nodes are reduced to semantically significant information
     * for an AST. Note that this method need not return an AST node
     * if it does not correspond to information requiring that it be
     * an AST node. For example, a Field of a Struct is its own CST node,
     * but for the sake of simplicity, its information can (and should) be kept in
     * its parent, the Struct AST node.
     */
    abstract reduce(): ReduceType;
}

/**
 * Base class for all AST (Abstract Syntax Tree) nodes.
 * 
 * An "Abstract Syntax Tree" is a tree containing the simplest logical syntax elements
 * that correspond to semantically significant parts of the source code.
 * The original source code cannot be produced from it, but an equivalent version
 * of the source code can be produced.
 * These classes are the primary data structures used throughout the compiler
 * frontend, and they contain operations such as:
 * - resolving the type of a syntax node
 * - transforming a syntax node to IR instructions
 * These nodes also store location information, which can be used in errors
 * to indicate the location of an error in the source code.
 */
export abstract class ASTNode {
    locations: { [key: string]: ILocation };
    type: TType;

    registerLocation(key: string, value: ILocation) {
        if (!this.locations) this.locations = {};
        this.locations[key] = value;
    }

    createAndRegisterLocation(key: string, start: ILocation, end: ILocation) {
        const location = {
            startLine: start.startLine,
            startColumn: start.startColumn,
            endLine: end.endLine,
            endColumn: end.endColumn,
        };
        this.registerLocation(key, location);
    }

    abstract visit<T>(visitor: INodeVisitor<T>): T;
}
