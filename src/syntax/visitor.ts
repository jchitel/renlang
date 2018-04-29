import { Declaration, TypeNode, Expression, Statement, Node } from '~/syntax/environment';


/**
 * Describes a visitor for a specific set of node types.
 * This visitor type is designed to work in a pure functional manner,
 * so each visitor accepts a node of the given type, and a value
 * of the return type, and should return a processed version of that
 * value. For example, a type checking visitor might be:
 * 
 * type TypeCheckVisitor = NodeVisitor<TypeChecker>;
 * 
 * And then each visitor function would be defined as:
 * 
 * const visitor: TypeCheckVisitor = {
 *     ...
 *     [SyntaxType.Something]: (node: Something, checker: TypeChecker): TypeChecker => { ... }
 *     ...
 * };
 * 
 * so the input checker would do some processing based on the node,
 * and return a new checker incorporating that node.
 * 
 * This generic Visitor type can visit any set of node types;
 * the other types exported by this module are predefined for the
 * known sets of node types.
 */
export type Visitor<N extends Node, T> = {
    [P in N['syntaxType']]: (node: N, thing: T) => T;
};

/** A visitor of declaration nodes */
export type DeclarationVisitor<T> = Visitor<Declaration, T>;
/** A visitor of type nodes */
export type TypeNodeVisitor<T> = Visitor<TypeNode, T>;
/** A visitor of expression nodes */
export type ExpressionVisitor<T> = Visitor<Expression, T>;
/** A visitor of statement nodes */
export type StatementVisitor<T> = Visitor<Statement, T>;
/** A visitor of all node types */
export type NodeVisitor<T> = Visitor<Node, T>;
