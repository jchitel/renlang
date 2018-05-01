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
     * Top-level interface for type checking.
     * Pass the path of an entry-point of a program, and get a fully type-checked
     * Program as a result. The Program will contain any errors found during checking,
     * and a reference to every successfully parsed module.
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
