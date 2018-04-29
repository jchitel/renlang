import * as ast from '~/syntax';
import IDeclarationVisitor from './interfaces/IDeclarationVisitor';
import TypeChecker from '~/typecheck/TypeChecker';
import { Token } from '~/parser/Tokenizer';
import TypeErrorContext from '~/typecheck/TypeErrorContext';
import resolveModule from '~/typecheck/resolveModule';
import parse from '~/parser';


/**
 * Visits all declarations in a module, registering each declaration by name.
 * This has two main parts:
 * - Registering imports and exports (and loading all imported modules for the whole app)
 * - Registering module-scope definitions by name, checking for name clashes with other declarations
 */
export default class DeclarationNameVisitor implements IDeclarationVisitor<void> {
    private error: TypeErrorContext;

    constructor(private typeChecker: TypeChecker) {
        this.error = new TypeErrorContext(typeChecker.errors);
    }
    /**
     * Asserts that the module at the specified path has been loaded,
     * parsed, and all declarations inside it have been registered.
     */
    private loadModule(path: string) {
        if (!this.typeChecker.names[path]) {
            const module = parse(path);
            // this will make sure that circular dependencies work TODO maybe?
            this.typeChecker.names[path] = {};
            this.typeChecker.exports[path] = {};
            module.visit(this);
        }
    }

    /**
     * Gives a declaration a unique id and registers it under the specified name
     */
    private addName(module: string, name: Token, decl: ast.Declaration) {
        const id = this.typeChecker.declarations.length;
        this.typeChecker.declarations.push(decl);
        const names = this.typeChecker.names[module];
        if (!names[name.image]) names[name.image] = [];
        names[name.image].push({ id, location: name.location });
    }

    /**
     * Registers an existing declaration id under a specified name
     */
    private addExport(module: string, name: Token, id: number) {
        const exports = this.typeChecker.exports[module];
        if (!exports[name.image]) exports[name.image] = [];
        exports[name.image].push({ id, location: name.location });
    }

    /**
     * Gives a declaration a unique it and registers it under a specified
     * declaration name and export name.
     */
    private addNameAndExport(module: string, exportName: Token, valueName: Token, decl: ast.Declaration) {
        const id = this.typeChecker.declarations.length;
        this.addName(module, valueName, decl);
        this.addExport(module, exportName, id);
    }

    /**
     * Gets the list of declarations of a given name in a given module
     */
    private getDeclarations(module: string, name: string) {
        if (!(name in this.typeChecker.names[module])) return [];
        return this.typeChecker.names[module][name].map(({ id, location }) => ({
            name: Token.fromLocation(location, name),
            declaration: this.typeChecker.declarations[id]
        }));
    }

    /**
     * Gets the list of exports of a given name in a given module
     */
    private getExports(module: string, name: string) {
        return this.typeChecker.exports[module][name].map(({ id, location }) => ({
            name: Token.fromLocation(location, name),
            declaration: this.typeChecker.declarations[id]
        }));
    }

    /**
     * Adds the declaration ids of the specified export name under the specified import name
     */
    private link(module: string, name: Token, importedModule: string, importedName: string) {
        const names = this.typeChecker.names[module], exports = this.typeChecker.exports[importedModule];
        if (!names[name.image]) names[name.image] = [];
        const decls = exports[importedName].map(({ id }) => ({ id, location: name.location }));
        names[name.image].push(...decls);
    }

    private getExport(path: string, name: string) {
        return this.typeChecker.exports[path][name];
    }

    /**
     * Once all declarations and exports have been added for a module,
     * go through them all to verify that there are no name clashes.
     * Constants and namespaces can have no clashes, only one declaration is allowed per name.
     * All other declarations can be overloaded, so more than one is allowed, but names
     * all have to be of the same type.
     */
    private checkNameClashes(module: string) {
        // constants and namespaces can have no clashes
        const noClashes: Function[] = [ast.ConstantDeclaration, ast.NamespaceDeclaration];
        for (const name of Object.keys(this.typeChecker.names[module])) {
            const list = this.getDeclarations(module, name);
            if (list.some(d => noClashes.includes(d.declaration.constructor)) && list.length > 1
                || list.some(d => list.some(d1 => d.declaration.constructor !== d1.declaration.constructor))) {
                for (const { name: token } of list) this.error.declNameClash(token);
            }
        }
        for (const name of Object.keys(this.typeChecker.exports[module])) {
            const list = this.getExports(module, name);
            if (list.some(d => noClashes.includes(d.declaration.constructor)) && list.length > 1
                || list.some(d => list.some(d1 => d.declaration.constructor !== d1.declaration.constructor))) {
                for (const { name: token } of list) this.error.exportClash(token);
            }
        }
    }

    visitModule(module: ast.Module): void {
        // process imports first to enumerate all modules
        for (const imp of module.imports) imp.visit(this);
        // process module-scoped declarations
        for (const decl of module.declarations.filter(d => !(d instanceof ast.ExportDeclaration))) decl.visit(this);
        // process exports last so all overloads are available
        for (const exp of module.declarations.filter(d => d instanceof ast.ExportDeclaration)) exp.visit(this);
        // add name clash messages
        this.checkNameClashes(module.location.path);
    }

    /**
     * An import declaration exposes an export of another module as a local name in the module
     * containing the declaration. To process it, we need to resolve the imported module path,
     * make sure that the requested export name exists, make sure that the requested alias name
     * does not clash with any already declared names, and then add the name to the module,
     * linking it to the exported declaration in the other module.
     */
    visitImportDeclaration(decl: ast.ImportDeclaration): void {
        const currentModule = decl.location.path;
        // resolve the module
        const importedModule = resolveModule(currentModule, decl.moduleName.value);
        // invalid module path specified
        if (!importedModule) return this.error.noModule(decl.moduleName);
        // make sure the module has been loaded
        this.loadModule(importedModule);
        // process the imports
        for (const { importName, aliasName } of decl.imports) {
            // if wildcard, process it as a namespace, not an import
            if (importName.image === '*') {
                const namespace = new ast.NamespaceDeclaration(importedModule, aliasName, decl.location);
                namespace.visit(this);
                continue;
            }
            // regular import, verify that the module exports the name
            if (!this.getExport(importedModule, importName.image)) {
                this.error.noModuleExport(decl.moduleName.value, importName);
                continue;
            }
            // register the alias name to the module using the imported export
            this.link(currentModule, aliasName, importedModule, importName.image);
        }
    }

    /**
     * All declarations are processed the same:
     * - make sure it has a name
     * - add the name under the containing module
     */
    private processDeclaration(decl: ast.Declaration) {
        const name = decl.name;
        if (!name) return this.error.noName(decl);
        this.addName(decl.location.path, name, decl);
    }

    visitNamespaceDeclaration(decl: ast.NamespaceDeclaration) { this.processDeclaration(decl); }
    visitTypeDeclaration(decl: ast.TypeDeclaration): void { this.processDeclaration(decl); }
    visitFunctionDeclaration(decl: ast.FunctionDeclaration): void { this.processDeclaration(decl); }
    visitConstantDeclaration(decl: ast.ConstantDeclaration): void { this.processDeclaration(decl); }

    visitExportDeclaration(decl: ast.ExportDeclaration): void {
        const module = decl.location.path;
        for (const { exportName, valueName, value } of decl.exports) {
            if (!exportName) {
                this.error.noName(decl);
                continue;
            }
            // determine the kind and match it with a value
            if (value) {
                // if the declaration has a name, add it to the module's names
                if (valueName) this.addNameAndExport(module, exportName, valueName, value);
                // otherwise, just make it an export
                else {
                    const id = this.typeChecker.declarations.length;
                    this.typeChecker.declarations.push(value);
                    this.addExport(module, exportName, id);
                }
            } else if (valueName) { // this will always be true if there is no inline value
                // exporting a non-declared value
                if (!(valueName.image in this.typeChecker.names[module])) {
                    this.error.valueNotDefined(valueName);
                    continue;
                }
                // add each declaration as an export
                for (const { id } of this.typeChecker.names[module][valueName.image])
                    this.addExport(module, exportName, id);
            }
        }
    }

    visitExportForwardDeclaration(decl: ast.ExportForwardDeclaration): void {
        const currentModule = decl.location.path;
        // resolve the module
        const importedModule = resolveModule(currentModule, decl.moduleName.value);
        // invalid module path specified
        if (!importedModule) return this.error.noModule(decl.moduleName);
        // make sure the module has been loaded
        this.loadModule(importedModule);
        // process the forwards
        for (const { importName, exportName } of decl.forwards) {
            if (importName.image === '*' && exportName.image !== '*') {
                // if wildcard, export a namespace
                const namespace = new ast.NamespaceDeclaration(importedModule, exportName, decl.location);
                const id = this.typeChecker.declarations.length;
                this.typeChecker.declarations.push(namespace);
                this.addExport(currentModule, exportName, id);
            } else if (importName.image === '*' && exportName.image === '*') {
                // forward all exports
                for (const imp of Object.keys(this.typeChecker.exports[importedModule])) {
                    for (const { id } of this.typeChecker.exports[importedModule][imp]) {
                        const token = Token.fromLocation(exportName.location, imp);
                        this.addExport(currentModule, token, id);
                    }
                }
            } else {
                // named export, verify that the module exports the name
                if (!this.getExport(importedModule, importName.image)) {
                    this.error.noModuleExport(decl.moduleName.value, importName);
                    continue;
                }
                // add the export
                for (const { id } of this.typeChecker.exports[importedModule][importName.image])
                    this.addExport(currentModule, importName, id);
            }
        }
    }

    /** TypeParams are not module-scoped declarations */
    visitTypeParam(_param: ast.TypeParam): void { throw new Error("Method not implemented"); }
    /** Params are not module-scoped declarations */
    visitParam(_param: ast.Param): void { throw new Error("Method not implemented"); }
    /** LambdaParams are not module-scoped declarations */
    visitLambdaParam(_param: ast.LambdaParam): void { throw new Error("Method not implemented"); }
}