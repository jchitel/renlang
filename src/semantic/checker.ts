import { Diagnostic, CoreObject } from '~/core';
import { Program, Module, Declaration, Namespace } from './program';
import { parseModule } from '~/parser';
import { ModuleVisitor } from './node-visitors/module-visitor';
import { TypeCheckErrorContext } from './error-context';
import { mapSet } from '~/utils/utils';
import { ModuleRoot, Declaration as SyntaxDeclaration } from '~/syntax';


export class TypeChecker extends CoreObject {
    readonly diagnostics: ReadonlyArray<Diagnostic> = [];
    readonly syntaxModules: ReadonlyMap<string, ModuleRoot> = new Map();
    readonly modules: ReadonlyMap<string, Module> = new Map();
    readonly syntaxDeclarations: ReadonlyArray<SyntaxDeclaration> = [];
    readonly declarations: ReadonlyArray<Declaration> = [];
    readonly namespaces: ReadonlyArray<Namespace> = [];
    readonly dependencies: ReadonlyArray<Dependency> = [];
    readonly errorContext: TypeCheckErrorContext = TypeCheckErrorContext;

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
    check(path: string): Program {
        // we can't do anything until we have a parsed module, so do that first
        let checker = this.parseModule(path);
        // if there is no module, there was a parse error, and we should return right away
        if (!checker.syntaxModules.size) return checker.createProgram();
        // 1st pass: resolve all modules, namespaces, and declarations
        const module = checker.syntaxModules.get(path)!;
        checker = ModuleVisitor[module.syntaxType](module, this);
        // 2nd pass: resolve all dependencies
        checker = checker.dependencies.reduce((tc, d) => processDependency(d, tc), checker);
        // 3rd pass: resolve all types
        checker = checker.syntaxDeclarations.reduce((tc, d) => DeclarationTypeVisitor[d.syntaxType](d, tc), checker);
        // 4th pass: handle name clashes (overloads are valid for all declarations)
        checker = checker.modules.reduce((tc, m) => NameClashVisitor[m.syntaxType](m, tc), checker);
        // everything has been type checked, return the program
        return checker.createProgram();
    }

    /**
     * Add an error to this type checker, using the specified
     * error generator function. This function will be passed
     * a context object that contains several built-in message
     * generator functions.
     */
    error(fn: (ctx: TypeCheckErrorContext) => Diagnostic): TypeChecker {
        return this.addDiagnostic(fn(this.errorContext));
    }

    /**
     * Given an absolute path to a module file, parse the module
     * and add it to the type checker's internal module registry.
     */
    parseModule(path: string): TypeChecker {
        const { module, diagnostics } = parseModule(path);
        return this.clone({
            syntaxModules: module ? mapSet(this.syntaxModules, path, module) : this.syntaxModules,
            diagnostics: [...this.diagnostics, ...diagnostics]
        });
    }

    /**
     * Add a diagnostic to the type checker.
     */
    addDiagnostic(diagnostic: Diagnostic): TypeChecker {
        return this.addDiagnostics([diagnostic]);
    }

    /**
     * Add a list of diagnostics to the type checker.
     */
    addDiagnostics(diagnostics: ReadonlyArray<Diagnostic>): TypeChecker {
        return this.clone({
            diagnostics: [...this.diagnostics, ...diagnostics]
        });
    }

    private createProgram(): Program {
        return new Program().clone({
            modules: this.modules,
            declarations: this.declarations,
            diagnostics: this.diagnostics
        });
    }
}
