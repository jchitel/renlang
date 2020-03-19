use std::{path::{Path, PathBuf}, collections::{HashMap, VecDeque}};
use super::dependencies::PureForward;
use crate::parser::parse_module;
use crate::core::{ Diagnostic, DiagResult };
use crate::syntax;
use crate::semantic::namespace as ns;

pub struct NamespaceEnumerationOutput {
    modules: HashMap<&'static Path, ns::ModuleRef>,
    namespaces: Vec<ns::Namespace>,
    declarations: Vec<ns::Declaration>,
    pure_forwards: Vec<PureForward>, // TODO: try to integrate this into the namespaces
    diagnostics: Vec<Diagnostic>,
}

pub fn enumerate_namespaces(main_module_path: PathBuf) -> DiagResult<NamespaceEnumerationOutput> {
    return EnumerationProcess::new(main_module_path).run();
}

enum Declaration {
    Import(syntax::ImportDeclaration),
    Export(syntax::ExportDeclaration),
    Forward(syntax::ExportForwardDeclaration),
    Decl(syntax::Declaration),
    Anon(syntax::AnonymousDeclaration)
}

struct EnumerationProcess {
    module_queue: VecDeque<PathBuf>,
    modules: HashMap<&'static Path, ns::ModuleRef>,
    namespaces: Vec<ns::Namespace>,
    declarations: Vec<ns::Declaration>,
    pure_forwards: Vec<PureForward>,
    diagnostics: Vec<Diagnostic>,
}

impl EnumerationProcess {
    fn new(main_module_path: PathBuf) -> EnumerationProcess {
        let process = EnumerationProcess {
            module_queue: VecDeque::new(),
            modules: HashMap::new(),
            namespaces: vec![],
            declarations: vec![],
            pure_forwards: vec![],
            diagnostics: vec![],
        };
        process.module_queue.push_back(main_module_path);
        process.modules.insert(main_module_path.as_ref(), ns::ModuleRef::Referenced { fullyResolved: false });
        process
    }

    fn run(&mut self) -> DiagResult<NamespaceEnumerationOutput> {
        self.consume_module_queue()?;
        DiagResult::ok(self.output())
    }

    fn consume_module_queue(&mut self) -> DiagResult<()> {
        if self.module_queue.is_empty() { return DiagResult::ok(()); }

        let module_path = self.module_queue.pop_front().unwrap();
        // parse the module
        let module_syntax = match parse_module(module_path) {
            DiagResult(Some(module_syntax), diags) => module_syntax,
            DiagResult(None, diags) => {
                todo!()
            }
        };

        todo!()
    }

    fn output(self) -> NamespaceEnumerationOutput {
        NamespaceEnumerationOutput {
            modules: self.modules,
            namespaces: self.namespaces,
            declarations: self.declarations,
            pure_forwards: self.pure_forwards,
            diagnostics: self.diagnostics
        }
    }
}

/*class EnumerationProcess extends CoreObject {
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
                next = next.setFailedModule(modulePath, ns.ModuleStatus.NOT_FOUND);
                // however, if this was the main module, we do need a diagnostic, and we need to stop right here
                if (modulePath === this.mainModulePath) return next.withEntryError(`Entry point "${this.mainModulePath}" not found.`);
                return next.consumeModuleQueue();
            }
            throw err;
        }
        // add any parse diagnostics
        next = next.addDiagnostics(parseDiagnostics);
        // the module couldn't be parsed, save it as unparsed and let the next pass set the error
        if (!moduleSyntax) {
            next = next.setFailedModule(modulePath, ns.ModuleStatus.UNPARSED);
            // if it was the main module, we stop right here
            if (modulePath === this.mainModulePath) return next.withEntryError(`Entry point "${this.mainModulePath}" failed to parse.`);
            return next.consumeModuleQueue();
        }
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

    setFailedModule(path: string, status: Exclude<ns.ModuleStatus, ns.ModuleStatus.SUCCESS>): EnumerationProcess {
        return this.mutate('modules', _ => _.iset(path, { namespaceId: null, status, fullyResolved: true }));
    }

    setSuccessfulModule(path: string): EnumerationProcess {
        const namespaceId = this.namespaces.length;
        return this
            .mutate('modules', _ => _.iset(path, { namespaceId, status: ns.ModuleStatus.SUCCESS, fullyResolved: false }))
            .mutate('namespaces', _ => [..._, new ns.ModuleNamespace(namespaceId, path)]);
    }

    addReferencedModule(path: string): EnumerationProcess {
        if (this.modules.has(path)) return this;
        return this
            .mutate('modules', _ => _.iset(path, { namespaceId: null, status: ns.ModuleStatus.REFERENCED, fullyResolved: false }))
            .mutate('moduleQueue', _ => _.append(path));
    }

    addImport(namespaceId: number, targetModule: string, targetModuleLocation: FileRange, localName: Token, exportName: Token): EnumerationProcess {
        let dep: Dependency;
        if (exportName.image === '*') {
            dep = new ImportedNamespace(namespaceId, localName, targetModule, targetModuleLocation, exportName.location);
        } else {
            dep = new ImportedName(namespaceId, localName, targetModule, targetModuleLocation, exportName);
        }
        return this.mutate('namespaces', _ => _.mutate(namespaceId, _ => _.mutateLocalTarget(localName.image, _ => _.addDependency(dep))));
    }

    addForward(namespaceId: number, targetModule: string, targetModuleLocation: FileRange, forwardName: Token, exportName: Token): EnumerationProcess {
        let dep: Dependency;
        if (exportName.image === '*') {
            if (forwardName.image === '*') {
                return this.mutate('pureForwards', _ => [..._, new PureForward(namespaceId, targetModule, targetModuleLocation, forwardName.location)]);
            } else {
                dep = new ForwardedNamespace(namespaceId, forwardName, targetModule, targetModuleLocation, exportName.location);
            }
        } else {
            dep = new ForwardedName(namespaceId, forwardName, targetModule, targetModuleLocation, exportName);
        }
        return this.mutate('namespaces', _ => _.mutate(namespaceId, _ => _.mutateExportTarget(exportName.image, _ => _.addDependency(dep))));
    }

    addExportedName(namespaceId: number, exportName: Token, localName: Token): EnumerationProcess {
        const dep = new ExportedName(namespaceId, localName, exportName);
        return this.mutate('namespaces', _ => _.mutate(namespaceId, _ => _.mutateExportTarget(exportName.image, _ => _.addDependency(dep))));
    }

    addExportedDeclaration(namespaceId: number, exportName: Token, declarationId: number): EnumerationProcess {
        return this.mutate('namespaces', _ => _.mutate(namespaceId, _ => _.addExportedDeclaration(exportName.image, declarationId)));
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

    handleDeclaration(node: AnyDeclaration, namespaceId: number, modulePath: string, containingExport: Optional<Token> = null): EnumerationProcess {
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
        let targetModule = resolveModule(modulePath, node.moduleName.value as string);
        if (!targetModule) {
            // resolve the would-be module path instead
            targetModule = resolve(modulePath, node.moduleName.value as string);
            next = next.setFailedModule(targetModule, ns.ModuleStatus.NOT_FOUND);
        } else {
            // add the referenced module (will be ignored if it was already referenced)
            next = next.addReferencedModule(targetModule);
        }
        // add import names
        for (const imp of node.imports) {
            next = next.addImport(namespaceId, targetModule, node.moduleName.location, imp.aliasName, imp.importName);
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
                next = next.handleDeclaration(exp.value, namespaceId, modulePath, exp.exportName);
            } else {
                // this is an exported name
                next = next.addExportedName(namespaceId, exp.exportName, exp.valueName!);
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
        let targetModule = resolveModule(modulePath, node.moduleName.value as string);
        if (!targetModule) {
            // resolve the would-be module path instead
            targetModule = resolve(modulePath, node.moduleName.value as string);
            next = next.setFailedModule(targetModule, ns.ModuleStatus.NOT_FOUND);
        } else {
            // add the referenced module (will be ignored if it was already referenced)
            next = next.addReferencedModule(targetModule);
        }
        // add forward names
        for (const fwd of node.forwards) {
            next = next.addForward(namespaceId, targetModule, node.moduleName.location, fwd.exportName, fwd.importName);
        }
        return next;
    }

    /**
     * Things that need to happen:
     * - Create a DeclaredType
     * - Register the DeclaredType to the process's declaration registry
     * - If there is a parent export, register the corresponding dependency
     */
    handleType(node: syntax.TypeDeclaration | syntax.AnonymousTypeDeclaration, namespaceId: number, containingExport: Optional<Token>) {
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
    handleFunction(node: syntax.FunctionDeclaration | syntax.AnonymousFunctionDeclaration, namespaceId: number, containingExport: Optional<Token>) {
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
    handleConstant(node: syntax.ConstantDeclaration | syntax.AnonymousConstantDeclaration, namespaceId: number, containingExport: Optional<Token>) {
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
    handleNamespace(node: syntax.NamespaceDeclaration | syntax.AnonymousNamespaceDeclaration, parentNamespaceId: number, modulePath: string, containingExport: Optional<Token>) {
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
}*/
