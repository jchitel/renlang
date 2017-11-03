import { Token } from '../parser/Tokenizer';


export interface ICSTSubTree {
    [component: string]: CSTChildNode | CSTChildNode[];
}

export type CSTChildNode = CSTNode | Token;

/**
 * Base class for all CST (Concrete Syntax Tree) nodes.
 * 
 * A "Concrete Syntax Tree" is a tree containing the raw parse result,
 * including ALL expanded non-terminals and ALL tokens.
 * The original source code can be produced from the CST.
 * Before doing further operations on the tree (such as type checking or IR transformation)
 * it is reduced to an equivalent Abstract Syntax Tree, or "AST" (see each syntax/.../reduce.ts file).
 *
 * Because these classes are only used in the context of parsing and syntax,
 * and because AST nodes will share the same name, these classes should be
 * prefixed with "ST" to distinguish them.
 */
export default abstract class CSTNode {
    [component: string]: CSTChildNode | CSTChildNode[] | undefined;

    constructor(properties: ICSTSubTree) {
        Object.assign(this, properties);
    }
}
