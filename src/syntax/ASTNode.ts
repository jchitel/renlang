import { ILocation } from '../parser/Tokenizer';
import { TType } from '../typecheck/types';
import INodeVisitor from './INodeVisitor';


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
export default abstract class ASTNode {
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