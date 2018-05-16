import { Dependency, ImportedNamespace, ImportedName, PureForward, ForwardedNamespace, ForwardedName, ExportedName, ExportedDeclaration } from './dependencies';
import { parseModule } from '~/parser';
import { Diagnostic, FilePosition, CoreObject } from '~/core';
import * as syntax from '~/syntax';
import { LazyList, single } from '~/utils/lazy-list';
import resolveModule from '~/semantic/resolver';
import { resolve } from 'path';
import * as ns from '~/semantic/namespace';


export interface NamespaceEnumerationOutput {
    readonly modules: ReadonlyMap<string, EnumeratedModule>;
    readonly namespaces: ReadonlyArray<ns.Namespace>;
    readonly declarations: ReadonlyArray<ns.Declaration>;
    readonly dependencyQueue: ReadonlyArray<Dependency>;
    readonly diagnostics: ReadonlyArray<Diagnostic>;
}

export interface EnumeratedModule {
    readonly namespaceId: Optional<number>;
    readonly status: ModuleEnumerationStatus;
}

export enum ModuleEnumerationStatus {
    /** The initial state of any module that is referenced, including the entry. Nothing has been done with it yet. */
    REFERENCED,
    /** The module was found and parsed */
    SUCCESS,
    /** The module was found, but failed to parse */
    UNPARSED,
    /** The module was not found */
    NOT_FOUND
}

export default function enumerateNamespaces(mainModulePath: string): NamespaceEnumerationOutput {
    return new EnumerationProcess(mainModulePath).run();
}

type AnyDeclaration
    = syntax.ImportDeclaration
    | syntax.ExportDeclaration 
    | syntax.ExportForwardDeclaration
    | syntax.Declaration
    | syntax.AnonymousDeclaration;

class EnumerationProcess extends CoreObject {
    readonly moduleQueue: LazyList<string>;
    readonly modules: ReadonlyMap<string, EnumeratedModule>;
    readonly namespaces: ReadonlyArray<ns.Namespace> = [];
    readonly declarations: ReadonlyArray<ns.Declaration> = [];
    readonly dependencyQueue: ReadonlyArray<Dependency> = [];
    readonly diagnostics: ReadonlyArray<Diagnostic> = [];

    constructor(readonly mainModulePath: string) {
        super();
        this.moduleQueue = single(mainModulePath);
        this.modules = new Map<string, EnumeratedModule>().iset(mainModulePath, { namespaceId: null, status: ModuleEnumerationStatus.REFERENCED });
    }

    run() {
        const final = this.consumeModuleQueue();
        return final.output();
    }

    consumeModuleQueue(): EnumerationProcess {
        if (this.moduleQueue.empty) return this;
        const { head: modulePath, tail: moduleQueue } = this.moduleQueue;
        let next: EnumerationProcess = this.set('moduleQueue', moduleQueue);
        // parse the module
        let moduleSyntax: Optional<syntax.ModuleRoot>, parseDiagnostics: ReadonlyArray<Diagnostic>;
        try {
            ({ module: moduleSyntax, diagnostics: parseDiagnostics } = parseModule(modulePath));
        } catch (err) {
            // "file not found" errors will be processed in the next pass so we get the import location, so just save as not found
            if (err.code === 'ENOENT') {
                next = next.setFailedModule(modulePath, ModuleEnumerationStatus.NOT_FOUND);
                // however, if this was the main module, we do need a diagnostic, and we need to stop right here
                if (modulePath === this.mainModulePath) return next.withEntryError(`Entry point "${this.mainModulePath}" not found.`);
                return next.consumeModuleQueue();
            }
            throw err;
        }
        // the module couldn't be parsed, save it as unparsed and let the next pass set the error
        if (!moduleSyntax) {
            next = next.setFailedModule(modulePath, ModuleEnumerationStatus.UNPARSED);
            // if it was the main module, we stop right here
            if (modulePath === this.mainModulePath) return next.withEntryError(`Entry point "${this.mainModulePath}" failed to parse.`);
            return next.consumeModuleQueue();
        }
        // add any parse diagnostics
        next = next.addDiagnostics(parseDiagnostics);
        // add the module to the module and namespace registries
        next = next.setSuccessfulModule(modulePath);
        const namespaceId = next.modules.get(modulePath)!.namespaceId!;
        // module parsed successfully, time to enumerate its contents
        for (const declaration of [...moduleSyntax.imports, ...moduleSyntax.declarations]) {
            next = next.handleDeclaration(declaration, namespaceId, modulePath);
        }
        // continue
        return next.consumeModuleQueue();
    }

    setFailedModule(path: string, status: ModuleEnumerationStatus): EnumerationProcess {
        return this.mutate('modules', _ => _.iset(path, { namespaceId: null, status }));
    }

    setSuccessfulModule(path: string): EnumerationProcess {
        const namespaceId = this.namespaces.length;
        return this
            .mutate('modules', _ => _.iset(path, { namespaceId, status: ModuleEnumerationStatus.SUCCESS }))
            .mutate('namespaces', _ => [..._, new ns.ModuleNamespace(namespaceId, path)]);
    }

    addReferencedModule(path: string): EnumerationProcess {
        if (this.modules.has(path)) return this;
        return this
            .mutate('modules', _ => _.iset(path, { namespaceId: null, status: ModuleEnumerationStatus.REFERENCED }))
            .mutate('moduleQueue', _ => _.append(path));
    }

    addImport(namespaceId: number, targetModule: string, localName: string, exportName: string): EnumerationProcess {
        let dep: Dependency;
        if (exportName === '*') {
            dep = new ImportedNamespace(namespaceId, localName, targetModule);
        } else {
            dep = new ImportedName(namespaceId, localName, targetModule, exportName);
        }
        return this.mutate('dependencyQueue', _ => [..._, dep]);
    }

    addForward(namespaceId: number, targetModule: string, forwardName: string, exportName: string): EnumerationProcess {
        let dep: Dependency;
        if (exportName === '*') {
            if (forwardName === '*') {
                dep = new PureForward(namespaceId, targetModule);
            } else {
                dep = new ForwardedNamespace(namespaceId, forwardName, targetModule);
            }
        } else {
            dep = new ForwardedName(namespaceId, forwardName, targetModule, exportName);
        }
        return this.mutate('dependencyQueue', _ => [..._, dep]);
    }

    addExportedName(namespaceId: number, exportName: string, localName: string): EnumerationProcess {
        const dep = new ExportedName(namespaceId, localName, exportName);
        return this.mutate('dependencyQueue', _ => [..._, dep]);
    }

    addExportedDeclaration(namespaceId: number, exportName: string, declarationId: number): EnumerationProcess {
        const dep = new ExportedDeclaration(namespaceId, declarationId, exportName);
        return this.mutate('dependencyQueue', _ => [..._, dep]);
    }

    addLocalName(namespaceId: number, name: string, declarationId: number): EnumerationProcess {
        return this.mutate('namespaces', _ => _.mutate(namespaceId, _ => _.addLocalDeclaration(name, declarationId)));
    }

    addDiagnostics(diagnostics: ReadonlyArray<Diagnostic>): EnumerationProcess {
        return this.mutate('diagnostics', _ => [..._, ...diagnostics]);
    }

    withEntryError(error: string): EnumerationProcess {
        return this.addDiagnostics([new Diagnostic(error, new FilePosition('<entry>', [0, 0]))]);
    }

    handleDeclaration(node: AnyDeclaration, namespaceId: number, modulePath: string, containingExport: Optional<string> = null): EnumerationProcess {
        if (node instanceof syntax.ImportDeclaration) return this.handleImport(node, namespaceId, modulePath);
        if (node instanceof syntax.ExportDeclaration) return this.handleExport(node, namespaceId, modulePath);
        if (node instanceof syntax.ExportForwardDeclaration) return this.handleForward(node, namespaceId, modulePath);
        if (node instanceof syntax.TypeDeclaration) return this.handleType(node, namespaceId, containingExport);
        if (node instanceof syntax.AnonymousTypeDeclaration) return this.handleType(node, namespaceId, containingExport);
        if (node instanceof syntax.FunctionDeclaration) return this.handleFunction(node, namespaceId, containingExport);
        if (node instanceof syntax.AnonymousFunctionDeclaration) return this.handleFunction(node, namespaceId, containingExport);
        if (node instanceof syntax.ConstantDeclaration) return this.handleConstant(node, namespaceId, containingExport);
        if (node instanceof syntax.AnonymousConstantDeclaration) return this.handleConstant(node, namespaceId, containingExport);
        if (node instanceof syntax.NamespaceDeclaration) return this.handleNamespace(node, namespaceId, modulePath, containingExport);
        return this.handleNamespace(node, namespaceId, modulePath, containingExport);
    }

    /**
     * Imports are processed by adding, for each name in the import,
     * a name to the parent namespace with the corresponding target type
     * and an entry to the dependency queue.
     * Additionally, the target module path should be resolved and added to the
     * module queue and registry, only if it does not already exist in the registry.
     */
    handleImport(node: syntax.ImportDeclaration, namespaceId: number, modulePath: string) {
        let next = this as EnumerationProcess;
        // handle the module name
        let targetModule = resolveModule(modulePath, node.moduleName.value);
        if (!targetModule) {
            // resolve the would-be module path instead
            targetModule = resolve(modulePath, node.moduleName.value);
            next = next.setFailedModule(targetModule, ModuleEnumerationStatus.NOT_FOUND);
        } else {
            // add the referenced module (will be ignored if it was already referenced)
            next = next.addReferencedModule(targetModule);
        }
        // add import names
        for (const imp of node.imports) {
            next = next.addImport(namespaceId, targetModule, imp.aliasName.image, imp.importName.image);
        }
        return next;
    }

    /**
     * Exports are processed by adding, for each name in the export,
     * an export to the parent namespace with the corresponding target type
     * and an entry to the dependency queue.
     * If the export is an exported declaration, the declaration must also be processed.
     */
    handleExport(node: syntax.ExportDeclaration, namespaceId: number, modulePath: string) {
        let next = this as EnumerationProcess;
        // add export names
        for (const exp of node.exports) {
            if (exp.value) {
                // pass the baton to the declaration handler, which will add the export for us
                next = next.handleDeclaration(exp.value, namespaceId, modulePath, exp.exportName.value);
            } else {
                // this is an exported name
                next = next.addExportedName(namespaceId, exp.exportName.image, exp.valueName!.image);
            }
        }
        return next;
    }

    /**
     * Forwards are processed by adding, for each name in the forward,
     * an export to the parent namespace with the corresponding target type
     * and an entry to the dependency queue.
     * Additionally, the target module path should be resolved and added to the
     * module queue and registry, only if it does not already exist in the registry.
     */
    handleForward(node: syntax.ExportForwardDeclaration, namespaceId: number, modulePath: string) {
        let next = this as EnumerationProcess;
        // handle the module name
        let targetModule = resolveModule(modulePath, node.moduleName.value);
        if (!targetModule) {
            // resolve the would-be module path instead
            targetModule = resolve(modulePath, node.moduleName.value);
            next = next.setFailedModule(targetModule, ModuleEnumerationStatus.NOT_FOUND);
        } else {
            // add the referenced module (will be ignored if it was already referenced)
            next = next.addReferencedModule(targetModule);
        }
        // add forward names
        for (const fwd of node.forwards) {
            next = next.addForward(namespaceId, targetModule, fwd.exportName.image, fwd.importName.image);
        }
        return next;
    }

    /**
     * Things that need to happen:
     * - Create a DeclaredType
     * - Register the DeclaredType to the process's declaration registry
     * - If there is a parent export, register the corresponding dependency
     * TODO add local-declaration local-names for each declaration
     */
    handleType(node: syntax.TypeDeclaration | syntax.AnonymousTypeDeclaration, namespaceId: number, containingExport: Optional<string>) {
        const declarationId = this.declarations.length;
        const declaredType = new ns.TypeDeclaration(declarationId, node);
        let next: EnumerationProcess = this.mutate('declarations', _ => [..._, declaredType]);
        if (node instanceof syntax.TypeDeclaration)
            next = next.addLocalName(namespaceId, node.name.image, declarationId);
        if (containingExport)
            return next.addExportedDeclaration(namespaceId, containingExport, declarationId);
        return next;
    }

    /**
     * Things that need to happen:
     * - Create a DeclaredFunction
     * - Register the DeclaredFunction to the process's declaration registry
     * - If there is a parent export, register the corresponding dependency
     */
    handleFunction(node: syntax.FunctionDeclaration | syntax.AnonymousFunctionDeclaration, namespaceId: number, containingExport: Optional<string>) {
        const declarationId = this.declarations.length;
        const declaredFunction = new ns.FunctionDeclaration(declarationId, node);
        let next: EnumerationProcess = this.mutate('declarations', _ => [..._, declaredFunction]);
        if (node instanceof syntax.FunctionDeclaration)
            next = next.addLocalName(namespaceId, node.name.image, declarationId);
        if (containingExport)
            return next.addExportedDeclaration(namespaceId, containingExport, declarationId);
        return next;
    }

    /**
     * Things that need to happen:
     * - Create a DeclaredConstant
     * - Register the DeclaredConstant to the process's declaration registry
     * - If there is a parent export, register the corresponding dependency
     */
    handleConstant(node: syntax.ConstantDeclaration | syntax.AnonymousConstantDeclaration, namespaceId: number, containingExport: Optional<string>) {
        const declarationId = this.declarations.length;
        const declaredConstant = new ns.ConstantDeclaration(declarationId, node);
        let next: EnumerationProcess = this.mutate('declarations', _ => [..._, declaredConstant]);
        if (node instanceof syntax.ConstantDeclaration)
            next = next.addLocalName(namespaceId, node.name.image, declarationId);
        if (containingExport)
            return next.addExportedDeclaration(namespaceId, containingExport, declarationId);
        return next;
    }

    /**
     * Things that need to happen:
     * - Create a DeclaredNamespace
     * - Register the DeclaredType to the process's declaration registry and namespace registry
     * - If there is a parent export, register the corresponding dependency
     * - Process all of the namespace's declarations
     */
    handleNamespace(node: syntax.NamespaceDeclaration | syntax.AnonymousNamespaceDeclaration, parentNamespaceId: number, modulePath: string, containingExport: Optional<string>) {
        const namespaceId = this.namespaces.length;
        const declarationId = this.declarations.length;
        const nestedNamespace = new ns.NestedNamespace(namespaceId, parentNamespaceId, declarationId, node);
        const declaredNamespace = new ns.NamespaceDeclaration(declarationId, namespaceId);
        let next: EnumerationProcess = this
            .mutate('declarations', _ => [..._, declaredNamespace])
            .mutate('namespaces', _ => [..._, nestedNamespace]);
        if (node instanceof syntax.NamespaceDeclaration)
            next = next.addLocalName(parentNamespaceId, node.name.image, declarationId);
        if (containingExport)
            next = next.addExportedDeclaration(parentNamespaceId, containingExport, declarationId);
        // process all declarations in the namespace
        for (const declaration of [...node.imports, ...node.declarations]) {
            next = next.handleDeclaration(declaration, namespaceId, modulePath);
        }
        return next;
    }

    output = (): NamespaceEnumerationOutput => ({
        modules: this.modules,
        namespaces: this.namespaces,
        declarations: this.declarations,
        dependencyQueue: this.dependencyQueue,
        diagnostics: this.diagnostics
    });
}
