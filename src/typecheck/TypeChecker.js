/**
 * The type checker will be implemented using the visitor pattern on a valid AST.
 * First, the syntax tree output will need to be collapsed to a proper AST, where there are no nodes with only one child,
 * and any unnecessary delimiters (such as commas and parentheses) and tokens that have no semantic purpose in the code are removed.
 * Next, the tree needs to be arranged properly, primarily around the binary operators.
 * Every operator must have a 'fixity' value (find a better name) that determines its precedence.
 * In the case of sequences of non-parenthesized binary expressions, the fixity value will determine how the tree will be arranged.
 * Once this step is done, semantic analysis can be done.
 * This will require multiple passes.
 * First, all types in the program must be enumerated.
 * This may require parsing other modules as an intermediate step and extracting their type information.
 * Here we may encounter type definitions that are invalid.
 * Because the program is syntactically correct, multiple errors can be emitted.
 * Then, we must analyze all logic nodes (expressions and statements) in all loaded modules' trees.
 * We need to create a flow graph linking all identifier declarations (including functions and operators) with places that they are used.
 * Then we need to start with all nodes that have a definite type and trace them along this flow diagram.
 * Any place where we come across a node that has been marked with a type that doesn't match the expected type, an error must be emitted.
 * Once we reach the end, any identifier that is not initialized will trigger an error, and any identifier with no inferred type will trigger an error.
 * Then we need to resolve all of this with parameter types and return types of functions.
 * At some point, we also need to do statement analysis, for example break and continue statements can only exist within loops, and explicit loop numbers for those must be valid.
 * We also need to verify that a main function exists in the entry point module and is of valid form.
 * Also, we are not dealing with closures this time around, so any variables accessed outside of their function scope will trigger errors.
 * Once that is done, we should be good and type checked.
 *
 * Ok, let's extract some actual steps out of this:
 * 0. Convert AST to actual AST
 * 1. Resolve all imports (process module imports, running the parser and starting over at step 0 for each one)
 * 2. Resolve all types (all encountered type declarations need to be stored in a type symbol table)
 * 3. Resolve all functions (all encountered function declarations need to be stored in a function symbol table)
 * 4. Resolve all exports (all exports need to be placed in an export table for each module)
 * For each function:
 * 5. Fix expression order (prededence and associativity, restructure tree to match proper operator semantics)
 * 6. Create flow graph for types (each referenced type mapped to every place it is used)
 * 6.5. Resolve types (all types with no corresponding declaration are an error)
 * 7. Create flow graph for functions (each referenced function mapped to every place it is used)
 * 8. Create flow graph for other declared values (each referenced variable/export mapped to every place it is used)
 * 9. Resolve declared names (every function or value referenced with no corresponding declaration are an error)
 * 10. Visit each function, tracing types
 *     - starting with everything with an explicit type [parameters and primitive literals], trace the flow of those types through everywhere they are used, marking types of expressions along the way.
 *     - any time a name is referenced, look it up in the symbol table, visiting it if it hasn't yet been visited
 *     - if a function or operator or other syntactic construct with a specific expression type is invoked with the wrong types, all errors
 *     - once a return expression is reached, it should match the return type of the function
 *     - this should flow from top to bottom of each function
 *     - every break and continue statement also needs to be checked
 * 11. Verify that the entry point has a valid main() function
 * 12. Return errors, if any
 * 13. If no errors, success, result is a table of modules with the main module marked with a special symbol.
 */
export default class TypeChecker {
    constructor(ast) {
        this.ast = ast;
    }
}
