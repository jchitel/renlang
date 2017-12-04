export { default as ASTNode } from './ASTNode';
// get the top-level node types out of the way first
import './declarations/Program';
import './types/Type';
import './statements/Statement';
import './expressions/Expression';

// export in this order:
// - declarations are dependent on types, expressions, and statements
// - statements are dependent on expressions
// - expressions are dependent on types
// - types aren't dependent on anything
// This may not be entirely necessary, but we don't want to have to deal with nonsense
export * from './types';
export * from './expressions';
export * from './statements';
export * from './declarations';
// INodeVisitor is dependent on EVERYTHING
export { default as INodeVisitor } from './INodeVisitor';
