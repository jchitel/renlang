import { Diagnostic, FileRange } from '~/core';
import { Program } from './program';
import { parseModule } from '~/parser';
import { ModuleVisitor } from './node-visitors/module-visitor';
import { Declaration, ModuleRoot } from '~/syntax';
import { TypeCheckErrorContext } from './error-context';


export interface TypeChecker {
    /**
     * Top-level interface for type checking.
     * Pass the path of an entry-point of a program, and get a fully type-checked
     * Program as a result. The Program will contain any errors found during checking,
     * and a reference to every successfully parsed module.
     */
    check(path: string): Program;
    /**
     * Add an error to this type checker, using the specified
     * error generator function. This function will be passed
     * a context object that contains several built-in message
     * generator functions.
     */
    error(fn: (ctx: TypeCheckErrorContext) => Diagnostic): TypeChecker;
    /**
     * Given an absolute path to a module file, parse the module
     * and add it to the type checker's internal module registry.
     */
    parseModule(path: string): TypeChecker;
    /**
     * Add a diagnostic to the type checker.
     */
    addDiagnostic(diagnostic: Diagnostic): TypeChecker;
    /**
     * Add a list of diagnostics to the type checker.
     */
    addDiagnostics(diagnostics: ReadonlyArray<Diagnostic>): TypeChecker;
}

interface NameEntry {
    moduleId: number;
    location: FileRange;
}

interface TypeCheckerInternal extends TypeChecker {
    readonly diagnostics: ReadonlyArray<Diagnostic>;
    readonly modules: ReadonlyArray<ModuleRoot>;
    readonly declarations: ReadonlyArray<Declaration>;
    readonly names: ReadonlyMap<string, ReadonlyMap<string, NameEntry>>;
    readonly exports: ReadonlyMap<string, ReadonlyMap<string, NameEntry>>;
    readonly errorContext: TypeCheckErrorContext;
    createProgram(): Program;
}

export function TypeChecker() {
    return TypeChecker.init();
}

export namespace TypeChecker {
    export function init(): TypeChecker {
        const checker: TypeCheckerInternal = {
            diagnostics: [],
            modules: [],
            declarations: [],
            names: new Map(),
            exports: new Map(),
            errorContext: TypeCheckErrorContext,
            check,
            error,
            parseModule: _parseModule,
            addDiagnostic,
            addDiagnostics,
            createProgram,
        };
        return checker;
    }

    function check(this: TypeCheckerInternal, path: string): Program {
        // we can't do anything until we have a parsed module, so do that first
        const withModule = this.parseModule(path) as TypeCheckerInternal;
        // if there is no module, there was a parse error, and we should return right away
        if (!withModule.modules.length) return withModule.createProgram();
        // 1st pass: resolve all names
        const module = withModule.modules[0];
        const firstPass = ModuleVisitor[module.syntaxType](module, this) as TypeCheckerInternal;
        // 2nd pass: resolve all types
        const secondPass = firstPass.declarations.reduce((tc, d) => DeclarationTypeVisitor[d.syntaxType](d, tc), firstPass);
        // 3rd pass: handle name clashes (overloads are valid for all declarations)
        const thirdPass = secondPass.modules.reduce((tc, m) => NameClashVisitor[m.syntaxType](m, tc), secondPass);
        // everything has been type checked, return the program
        return thirdPass.createProgram();
    }

    function error(this: TypeCheckerInternal, fn: (ctx: TypeCheckErrorContext) => Diagnostic) {
        return this.addDiagnostic(fn(this.errorContext));
    }

    function _parseModule(this: TypeCheckerInternal, path: string) {
        const { module, diagnostics } = parseModule(path);
        return {
            ...this,
            modules: module ? [...this.modules, module] : this.modules,
            diagnostics: [...this.diagnostics, ...diagnostics]
        };
    }

    function addDiagnostic(this: TypeCheckerInternal, diagnostic: Diagnostic) {
        return this.addDiagnostics([diagnostic]);
    }

    function addDiagnostics(this: TypeCheckerInternal, diagnostics: ReadonlyArray<Diagnostic>) {
        return {
            ...this,
            diagnostics: [...this.diagnostics, ...diagnostics]
        }
    }

    function createProgram(this: TypeCheckerInternal) {
        return new Program().clone({
            // TODO: modules?
            diagnostics: this.diagnostics
        });
    }
}