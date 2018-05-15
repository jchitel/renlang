import { Program } from './program';
import enumerateNamespaces from './passes/enumeration';


/**
 * Top-level interface for semantic analysis.
 * 
 * Pass 1 - Namespace Enumeration:
 * - Starting with the first module, enumerate all declarations, including imports, exports, and forwards
 * - Recursively enumerate all referenced modules and all namespaces
 * - Inputs:
 *   - the main module path
 * - Outputs:
 *   - module registry (all modules by path)
 *   - declaration registry (all declarations by id)
 *   - namespace registry (all namespaces by id)
 *   - dependency queue (a built queue of dependencies that need to be resolved)
 *   - any errors from the process
 * - NOTE: this does NOT involve actually processing the internals of declarations, only names and references
 * Pass 2 - Dependency Resolution:
 * - One output of the first pass was a dependency queue. Now that enumeration is done, we must process those dependencies
 * - This involves resolving all imports and exports to corresponding declarations, creting a reference chain
 * - Inputs:
 *   - module registry
 *   - declaration registry
 *   - namespace registry
 *   - dependency queue
 * - Outputs:
 *   - module registry (unchanged)
 *   - declaration registry (unchanged)
 *   - namespace registry, now with names and exports resolved
 *   - any errors from the process
 * Pass 3 - Type Checking:
 * - Now that we have all declarations enumerated, and all declaration references resolved, we resolve the types of everything
 * - This involves setting the type of everything that is typeable
 * - As well as making sure that assignability is correct
 * - Inputs:
 *   - declaration registry
 *   - namespace registry
 * - Outputs:
 *   - declaration registry, now with everything typed
 *   - namespace registry (unchanged)
 *   - any errors from the process
 * Pass 4 - Name Clash Checking:
 * - Once we have resolved the type of everything, we can make sure that everything that has the same name is able to do so
 * - Some declarations can be merged, others cannot
 * - Several things can be overloaded, but those overloads must be valid
 * - Inputs:
 *   - namespace registry
 *   - declaration registry
 * - Outputs:
 *   - namespace registry, now with name clashes processed (may create overloads, merges, etc.)
 *   - declaration registry (possibly unchanged, overloads and merges may need to change things)
 *   - any errors from the process
 * 
 * Once we are done with all passes, we output a Program instance that contains all errors and all modules (which contain all namespaces, which contain all declarations).
 */
export default function analyze(path: string) {
    // Pass 1: Enumeration
    const enumeration = enumerateNamespaces(path);
    // Pass 2: Resolution
    const resolution = resolveDependencies(enumeration.modules, enumeration.declarations, enumeration.namespaces, enumeration.dependencyQueue);
    // Pass 3: Typechecking
    const typechecked = typecheck(enumeration.declarations, resolution.namespaces);
    // Pass 4: Name clashes
    const nameClash = checkNameClashes(typechecked.declarations, resolution.namespaces);
    // Create program
    const diagnostics = [...enumeration.diagnostics, ...resolution.diagnostics, ...typechecked.diagnostics, ...nameClash.diagnostics];
    return new Program(enumeration.modules, resolution.namespaces, nameClash.declarations, diagnostics);
}
